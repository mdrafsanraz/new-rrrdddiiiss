import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { parseLabelGridStatement } from "./csv";
import { calculateRoyaltyAmounts } from "./calculation";

const headers = "pay_period,retailer,territory,upc,release,isrc,track_artist,track_title,type,purchase_qty,gross_usd,total_labelgrid_fee,net_revenue_usd";

test("parses quoted international CSV and preserves micro-royalty precision", () => {
  const csv = `${headers}\n2026-08-01,"DSP, One",BD,123,"Release, One",BDABC1234567,"Artiste Ñ","Track ""One""",stream,1,0.000000123456,-0.000000024691,0.000000098765\n`;
  const parsed = parseLabelGridStatement(Buffer.from(csv));
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].trackTitle, 'Track "One"');
  assert.equal(parsed.totals.net.toString(), "9.8765e-8");
  assert.equal(parsed.rows[0].rawSourceData.retailer, "DSP, One");
});

test("rejects missing required columns", () => {
  assert.throws(() => parseLabelGridStatement(Buffer.from("pay_period,gross_usd\n2026-08-01,1")), /Missing required columns/);
});

test("reports malformed monetary rows without silently importing money", () => {
  const parsed = parseLabelGridStatement(Buffer.from(`${headers}\n2026-08-01,DSP,US,123,R,ISRC,A,T,stream,1,not-money,-0.2,0.8`));
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.errors.length, 1);
});

test("calculates commission and negative refunds with Decimal arithmetic", () => {
  const normal = calculateRoyaltyAmounts({ upstreamNet: "100.000000000001", commissionRate: "10" });
  assert.equal(normal.payable.toString(), "90.0000000000009");
  const refund = calculateRoyaltyAmounts({ upstreamNet: "-100", commissionRate: "10" });
  assert.equal(refund.payable.toString(), "-90");
});

test("supports revenue share and explicit adjustments", () => {
  const result = calculateRoyaltyAmounts({ upstreamNet: new Prisma.Decimal("10"), revenueShareRate: "75", fixedAdjustment: "0.25", manualAdjustment: "0.10" });
  assert.equal(result.payable.toString(), "7.15");
});
