import { Prisma, RoyaltyMatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseLabelGridStatement } from "@/lib/royalties/csv";

function monthBounds(payPeriod: string) {
  const start = new Date(`${payPeriod.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end, key: payPeriod.slice(0, 7) };
}

export async function importRoyaltyStatement(input: { buffer: Buffer; fileName: string; uploadedById: string }) {
  const parsed = parseLabelGridStatement(input.buffer);
  if (parsed.errors.length) {
    throw new Error(`Import stopped: ${parsed.errors.length} malformed row(s). ${parsed.errors.slice(0, 3).map((error) => error.message).join(" ")}`);
  }
  if (parsed.payPeriods.length !== 1) throw new Error("A statement must contain exactly one pay period.");
  const duplicate = await prisma.royaltyImport.findUnique({ where: { checksum: parsed.checksum }, select: { id: true } });
  if (duplicate) throw new Error("This statement appears to have already been imported.");

  const bounds = monthBounds(parsed.payPeriods[0]);
  const isrcs = [...new Set(parsed.rows.map((row) => row.isrc).filter((value): value is string => Boolean(value)))];
  const upcs = [...new Set(parsed.rows.map((row) => row.upc).filter((value): value is string => Boolean(value)))];
  const [tracks, releases] = await Promise.all([
    prisma.track.findMany({ where: { isrc: { in: isrcs, mode: "insensitive" } }, include: { release: { select: { id: true, userId: true, upc: true, labelgridId: true } } } }),
    prisma.release.findMany({ where: { upc: { in: upcs } }, select: { id: true, userId: true, upc: true, labelgridId: true, tracks: { select: { id: true, isrc: true, labelgridId: true } } } }),
  ]);
  const byIsrc = new Map<string, typeof tracks>();
  for (const track of tracks) {
    const key = track.isrc?.toUpperCase();
    if (key) byIsrc.set(key, [...(byIsrc.get(key) ?? []), track]);
  }
  const byUpc = new Map(releases.map((release) => [release.upc, release]));

  return prisma.$transaction(async (tx) => {
    const period = await tx.royaltyPeriod.upsert({
      where: { period: bounds.key },
      update: { status: "matching", importedAt: new Date() },
      create: { period: bounds.key, startDate: bounds.start, endDate: bounds.end, status: "matching", importedAt: new Date() },
    });
    if (period.status === "published") throw new Error("Published royalty periods are immutable.");
    const royaltyImport = await tx.royaltyImport.create({
      data: {
        royaltyPeriodId: period.id,
        fileName: input.fileName,
        checksum: parsed.checksum,
        uploadedById: input.uploadedById,
        payPeriod: parsed.payPeriods[0],
        rowCount: parsed.rows.length,
        totalSourceGross: parsed.totals.gross,
        totalSourceFees: parsed.totals.fees,
        totalSourceNet: parsed.totals.net,
        headerMap: parsed.headers,
      },
    });

    const data: Prisma.RoyaltyTransactionCreateManyInput[] = parsed.rows.map((row) => {
      const candidates = row.isrc ? byIsrc.get(row.isrc) ?? [] : [];
      let matchStatus: RoyaltyMatchStatus = "unmatched";
      let matchMethod: string | null = null;
      let matchNotes: string | null = null;
      let match = candidates.length === 1 ? candidates[0] : null;
      if (candidates.length > 1) {
        matchStatus = "conflict";
        matchNotes = "ISRC maps to multiple RDISTRO tracks.";
      } else if (match) {
        if (row.upc && match.release.upc && row.upc !== match.release.upc) {
          matchStatus = "conflict";
          matchNotes = "ISRC ownership matched, but UPC does not match the release.";
          match = null;
        } else {
          matchStatus = "matched";
          matchMethod = "exact_isrc";
        }
      } else if (row.upc) {
        const release = byUpc.get(row.upc);
        if (release && release.tracks.length === 1) {
          const onlyTrack = release.tracks[0];
          matchStatus = "matched";
          matchMethod = "exact_upc_single_track";
          return { ...row, rawSourceData: row.rawSourceData, royaltyImportId: royaltyImport.id, royaltyPeriodId: period.id, matchStatus, matchMethod, userId: release.userId, releaseId: release.id, trackId: onlyTrack.id, labelgridReleaseId: release.labelgridId, labelgridTrackId: onlyTrack.labelgridId };
        }
      }
      return { ...row, rawSourceData: row.rawSourceData, royaltyImportId: royaltyImport.id, royaltyPeriodId: period.id, matchStatus, matchMethod, matchNotes, userId: match?.release.userId, releaseId: match?.release.id, trackId: match?.id, labelgridReleaseId: match?.release.labelgridId, labelgridTrackId: match?.labelgridId };
    });
    await tx.royaltyTransaction.createMany({ data });
    const conflictCount = data.filter((row) => row.matchStatus === "conflict").length;
    const unmatchedCount = data.filter((row) => row.matchStatus === "unmatched").length;
    await tx.royaltyPeriod.update({ where: { id: period.id }, data: { status: conflictCount || unmatchedCount ? "needs_review" : "imported" } });
    await tx.royaltyImport.update({ where: { id: royaltyImport.id }, data: { status: conflictCount || unmatchedCount ? "needs_review" : "imported" } });
    return { periodId: period.id, importId: royaltyImport.id, rowCount: data.length, matchedCount: data.length - conflictCount - unmatchedCount, unmatchedCount, conflictCount, totals: parsed.totals };
  }, { timeout: 60_000 });
}
