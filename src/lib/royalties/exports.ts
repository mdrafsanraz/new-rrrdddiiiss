import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";

export async function getOwnedPublishedStatement(statementId: string, userId: string) {
  return prisma.userRoyaltyStatement.findFirst({
    where: { id: statementId, userId, royaltyPeriod: { status: "published" } },
    include: {
      user: { select: { name: true, email: true } },
      royaltyPeriod: true,
      transactions: { orderBy: { sourceRowNumber: "asc" }, select: { retailer: true, territory: true, upc: true, releaseTitle: true, isrc: true, artistName: true, trackTitle: true, usageType: true, quantity: true, sourceNetRevenueUsd: true, rdistroCommissionUsd: true, rdistroAdjustmentsUsd: true, rdistroOtherDeductionsUsd: true, userPayableUsd: true } },
    },
  });
}

function exportRows(statement: NonNullable<Awaited<ReturnType<typeof getOwnedPublishedStatement>>>) {
  return statement.transactions.map((row) => ({
    "Statement Period": statement.royaltyPeriod.period,
    Store: row.retailer ?? "",
    Territory: row.territory ?? "",
    UPC: row.upc ?? "",
    Release: row.releaseTitle ?? "",
    ISRC: row.isrc ?? "",
    Artist: row.artistName ?? "",
    Track: row.trackTitle ?? "",
    "Usage Type": row.usageType ?? "",
    Quantity: row.quantity.toString(),
    "Revenue Basis (USD)": row.sourceNetRevenueUsd.toString(),
    "RDISTRO Deductions (USD)": row.rdistroCommissionUsd.plus(row.rdistroAdjustmentsUsd).plus(row.rdistroOtherDeductionsUsd).toString(),
    "Net Earnings (USD)": row.userPayableUsd.toString(),
  }));
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function statementCsv(statement: NonNullable<Awaited<ReturnType<typeof getOwnedPublishedStatement>>>) {
  const rows = exportRows(statement);
  const headers = Object.keys(rows[0] ?? { "Statement Period": "", Store: "", Territory: "", UPC: "", Release: "", ISRC: "", Artist: "", Track: "", "Usage Type": "", Quantity: "", "Revenue Basis (USD)": "", "RDISTRO Deductions (USD)": "", "Net Earnings (USD)": "" });
  return `\ufeff${[headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\r\n")}`;
}

export async function statementXlsx(statement: NonNullable<Awaited<ReturnType<typeof getOwnedPublishedStatement>>>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RDISTRO";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Statement Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  summary.columns = [{ width: 26 }, { width: 42 }];
  summary.addRows([
    ["RDISTRO Royalty Statement"],
    ["Statement period", statement.royaltyPeriod.period],
    ["Account", statement.user.name],
    ["Email", statement.user.email],
    ["Net earnings (USD)", Number(statement.userPayableTotal)],
    ["Transactions", statement.transactionCount],
    ["Generated", new Date().toISOString()],
  ]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF161616" } };
  summary.getCell("B5").numFmt = "$#,##0.000000";

  const transactions = workbook.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 1 }] });
  const rows = exportRows(statement);
  const headers = Object.keys(rows[0] ?? { "Statement Period": "", Store: "", Territory: "", UPC: "", Release: "", ISRC: "", Artist: "", Track: "", "Usage Type": "", Quantity: "", "Revenue Basis (USD)": "", "RDISTRO Deductions (USD)": "", "Net Earnings (USD)": "" });
  transactions.columns = headers.map((header, index) => ({ header, key: header, width: [16, 22, 14, 18, 30, 18, 24, 30, 18, 12, 23, 27, 22][index] }));
  for (const row of rows) transactions.addRow(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, ["Quantity", "Revenue Basis (USD)", "RDISTRO Deductions (USD)", "Net Earnings (USD)"].includes(key) ? Number(value) : value])));
  transactions.autoFilter = { from: "A1", to: `M${Math.max(1, transactions.rowCount)}` };
  transactions.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  transactions.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF161616" } };
  [10, 11, 12, 13].forEach((column) => { transactions.getColumn(column).numFmt = column === 10 ? "0.########" : "$#,##0.000000000000"; });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
