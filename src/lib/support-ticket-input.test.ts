import assert from "node:assert/strict";
import test from "node:test";
import { supportTicketMessage, userSupportTicketSchema } from "./support-ticket-input";

const ticket = { subject: "Release help", category: "release", body: "Please help resolve this release." };

test("release tickets require a usable identifier on the server", () => {
  for (const releaseReference of [undefined, "", "  ", "#", "CAT\n123"]) {
    assert.equal(userSupportTicketSchema.safeParse({ ...ticket, releaseReference }).success, false);
  }
});

test("both UPCs and catalog numbers prefix the saved message exactly once", () => {
  for (const releaseReference of ["123456789012", "RD-2026-123", " #RD-2026-123 "]) {
    const input = userSupportTicketSchema.parse({ ...ticket, releaseReference });
    assert.equal(supportTicketMessage(input), `#${input.releaseReference} - ${ticket.body}`);
    assert.ok(!supportTicketMessage(input).startsWith("##"));
  }
});

test("other categories need no identifier and retain their message", () => {
  for (const category of ["general", "billing", "account", "technical"]) {
    const input = userSupportTicketSchema.parse({ ...ticket, category });
    assert.equal(supportTicketMessage(input), ticket.body);
  }
});
