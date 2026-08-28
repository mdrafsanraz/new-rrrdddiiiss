import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

const REQUIRED_HEADERS = [
  "pay_period",
  "retailer",
  "territory",
  "upc",
  "release",
  "isrc",
  "track_artist",
  "track_title",
  "gross_usd",
  "total_labelgrid_fee",
  "net_revenue_usd",
] as const;

export type ParsedRoyaltyRow = {
  sourceRowNumber: number;
  payPeriod: string;
  retailer: string | null;
  territory: string | null;
  upc: string | null;
  releaseTitle: string | null;
  isrc: string | null;
  artistName: string | null;
  trackTitle: string | null;
  usageType: string | null;
  quantity: Prisma.Decimal;
  sourceGrossUsd: Prisma.Decimal;
  sourceTotalLabelGridFee: Prisma.Decimal;
  sourceNetRevenueUsd: Prisma.Decimal;
  rawSourceData: Record<string, string>;
  sourceFingerprint: string;
};

export type RoyaltyParseResult = {
  checksum: string;
  headers: string[];
  rows: ParsedRoyaltyRow[];
  errors: Array<{ row: number; message: string }>;
  payPeriods: string[];
  totals: { gross: Prisma.Decimal; fees: Prisma.Decimal; net: Prisma.Decimal };
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\ufeff/, "").replace(/[\s-]+/g, "_");
}

/** RFC 4180-compatible parser, including quoted newlines and escaped quotes. */
function parseCsv(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  return records;
}

function decimal(value: string, field: string, row: number) {
  const normalized = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!normalized) return new Prisma.Decimal(0);
  try {
    return new Prisma.Decimal(normalized);
  } catch {
    throw new Error(`Invalid ${field} monetary value on row ${row}.`);
  }
}

function clean(value?: string) {
  const result = value?.trim();
  return result ? result : null;
}

export function parseLabelGridStatement(buffer: Buffer): RoyaltyParseResult {
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const records = parseCsv(buffer.toString("utf8"));
  if (!records.length) throw new Error("The statement is empty.");

  const headers = records[0].map(normalizeHeader);
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeaders.length) throw new Error(`Duplicate normalized columns: ${[...new Set(duplicateHeaders)].join(", ")}`);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const rows: ParsedRoyaltyRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let gross = new Prisma.Decimal(0);
  let fees = new Prisma.Decimal(0);
  let net = new Prisma.Decimal(0);

  records.slice(1).forEach((values, offset) => {
    const sourceRowNumber = offset + 2;
    try {
      const rawSourceData = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const payPeriod = rawSourceData.pay_period?.trim();
      if (!payPeriod || Number.isNaN(Date.parse(payPeriod))) throw new Error(`Invalid pay_period on row ${sourceRowNumber}.`);
      const sourceGrossUsd = decimal(rawSourceData.gross_usd, "gross_usd", sourceRowNumber);
      const sourceTotalLabelGridFee = decimal(rawSourceData.total_labelgrid_fee, "total_labelgrid_fee", sourceRowNumber);
      const sourceNetRevenueUsd = decimal(rawSourceData.net_revenue_usd, "net_revenue_usd", sourceRowNumber);
      const quantity = decimal(rawSourceData.purchase_qty || rawSourceData.track_count || "0", "quantity", sourceRowNumber);
      const fingerprint = [payPeriod, rawSourceData.retailer, rawSourceData.territory, rawSourceData.upc, rawSourceData.isrc, rawSourceData.type, quantity.toString(), sourceGrossUsd.toString(), sourceNetRevenueUsd.toString(), rawSourceData.dsp_statement_id, sourceRowNumber].join("|");
      rows.push({
        sourceRowNumber,
        payPeriod,
        retailer: clean(rawSourceData.retailer),
        territory: clean(rawSourceData.territory),
        upc: clean(rawSourceData.upc),
        releaseTitle: clean(rawSourceData.release),
        isrc: clean(rawSourceData.isrc)?.toUpperCase() ?? null,
        artistName: clean(rawSourceData.track_artist),
        trackTitle: clean(rawSourceData.track_title),
        usageType: clean(rawSourceData.type),
        quantity,
        sourceGrossUsd,
        sourceTotalLabelGridFee,
        sourceNetRevenueUsd,
        rawSourceData,
        sourceFingerprint: createHash("sha256").update(fingerprint).digest("hex"),
      });
      gross = gross.plus(sourceGrossUsd);
      fees = fees.plus(sourceTotalLabelGridFee);
      net = net.plus(sourceNetRevenueUsd);
    } catch (error) {
      errors.push({ row: sourceRowNumber, message: error instanceof Error ? error.message : "Malformed row" });
    }
  });

  return {
    checksum,
    headers,
    rows,
    errors,
    payPeriods: [...new Set(rows.map((row) => row.payPeriod))],
    totals: { gross, fees, net },
  };
}
