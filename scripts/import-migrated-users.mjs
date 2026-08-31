import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import JSZip from "jszip";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const arguments_ = process.argv.slice(2);
const apply = arguments_.includes("--apply");
const filePath = arguments_.find((argument) => argument !== "--apply");

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

async function readRows(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const sheet = zip.file("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The workbook does not contain sheet1.xml.");
  const xml = await sheet.async("string");
  return [...xml.matchAll(/<[^:>]*:?row[^>]*>([\s\S]*?)<\/[^:>]*:?row>/g)].map(
    (rowMatch) => {
      const row = {};
      for (const cell of rowMatch[1].matchAll(
        /<[^:>]*:?c[^>]*r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/[^:>]*:?c>/g
      )) {
        const value = cell[2].match(
          /<[^:>]*:?v>([\s\S]*?)<\/[^:>]*:?v>/
        )?.[1];
        row[cell[1]] = decodeXml(value ?? "").trim();
      }
      return row;
    }
  );
}

async function main() {
  if (!filePath) {
    throw new Error(
      "Usage: npm run import:migrated-users -- /path/to/users.xlsx [--apply]"
    );
  }

  const [header, ...rows] = await readRows(filePath);
  if (header?.A?.toLowerCase() !== "email" || header?.B?.toLowerCase() !== "account type") {
    throw new Error('Expected columns "Email" and "Account Type".');
  }

  const accounts = rows.map((row, index) => {
    const email = row.A?.toLowerCase().trim();
    const accountType = row.B?.toLowerCase().trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error(`Invalid email on workbook row ${index + 2}.`);
    }
    if (accountType !== "starter" && accountType !== "pro") {
      throw new Error(`Invalid account type on workbook row ${index + 2}.`);
    }
    return { email, planId: accountType };
  });

  const uniqueEmails = new Set(accounts.map((account) => account.email));
  if (uniqueEmails.size !== accounts.length) {
    throw new Error("The workbook contains duplicate emails.");
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    accounts: accounts.length,
    starter: accounts.filter((account) => account.planId === "starter").length,
    pro: accounts.filter((account) => account.planId === "pro").length,
  };
  if (!apply) {
    console.log(JSON.stringify(summary));
    return;
  }

  const existing = await prisma.user.count({
    where: { email: { in: [...uniqueEmails] } },
  });
  console.log(
    JSON.stringify({
      ...summary,
      existing,
      creating: accounts.length - existing,
    })
  );

  const unusablePasswordHash = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
  const migratedAt = new Date();
  for (let offset = 0; offset < accounts.length; offset += 50) {
    const batch = accounts.slice(offset, offset + 50);
    await prisma.$transaction(
      batch.map((account) =>
        prisma.user.upsert({
          where: { email: account.email },
          update: {
            planId: account.planId,
            mustResetPassword: true,
            migrationNotice: true,
            migratedAt,
          },
          create: {
            email: account.email,
            name: "RDISTRO Artist",
            passwordHash: unusablePasswordHash,
            planId: account.planId,
            mustResetPassword: true,
            migrationNotice: true,
            migratedAt,
          },
        })
      )
    );
  }
  console.log(JSON.stringify({ imported: accounts.length }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
