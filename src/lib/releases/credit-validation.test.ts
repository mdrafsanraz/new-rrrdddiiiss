import assert from "node:assert/strict";
import test from "node:test";
import { contributorRoleLimitError, requiredWriterSplitsError } from "./credit-validation";
import { validateReleaseForSubmit } from "./submit-validate";

test("ten contributor roles are allowed, eleven are rejected with the person's name", () => {
  const contributor = { firstName: "Test", lastName: "Writer", roles: Array.from({ length: 10 }, (_, i) => `Role ${i}`) };
  assert.equal(contributorRoleLimitError(contributor), null);
  assert.match(contributorRoleLimitError({ ...contributor, roles: [...contributor.roles, "Extra"] })!, /10 roles for Test Writer/);
});

test("composition splits cannot be omitted", () => {
  assert.match(requiredWriterSplitsError([])!, /Writers & Composition Splits/);
  assert.equal(requiredWriterSplitsError([{ writerId: 1 }]), null);
});

test("server rejects missing splits and excessive roles before provider submission", () => {
  const fixture = {
    title: "Test", contentType: "Single", artistId: "artist", artist: {}, releaseDate: new Date(),
    storesJson: "{}", territoriesJson: "{}",
    metadataJson: JSON.stringify({ primaryGenreId: 1, selfPublished: true, clineName: "Owner", plineName: "Owner", clineYear: 2026, plineYear: 2026 }),
    tracks: [{ title: "Test", trackNumber: 1, metadataJson: JSON.stringify({ contributors: [{ writerId: 1, firstName: "Test", lastName: "Writer", roles: Array.from({ length: 11 }, (_, i) => `Role ${i}`) }] }) }],
  } as unknown as Parameters<typeof validateReleaseForSubmit>[0];
  const errors = validateReleaseForSubmit(fixture);
  assert.ok(errors.some((error) => error.includes("Writers & Composition Splits")));
  assert.ok(errors.some((error) => error.includes("10 roles")));
  fixture.metadataJson = JSON.stringify({ ...JSON.parse(fixture.metadataJson!), writerSplits: [{ writerId: 1, firstName: "Test", lastName: "Writer", roles: ["Composer"], share: 100 }] });
  fixture.tracks[0].metadataJson = JSON.stringify({ contributors: [{ writerId: 1, roles: ["Artist", "Composer", "Producer"] }] });
  assert.deepEqual(validateReleaseForSubmit(fixture), []);
  fixture.tracks[0].metadataJson = JSON.stringify({ ...JSON.parse(fixture.tracks[0].metadataJson!), mixVersion: "remastered version" });
  assert.ok(validateReleaseForSubmit(fixture).some((error) => error.includes("mix versions")));
  fixture.metadataJson = JSON.stringify({ ...JSON.parse(fixture.metadataJson!), mixVersion: "remastered version" });
  assert.deepEqual(validateReleaseForSubmit(fixture), []);
});
