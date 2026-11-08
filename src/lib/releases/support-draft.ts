/** Prefill a ticket with feedback from an ownership-checked release. */
export function releaseSupportDraft(release: {
  id: string;
  title: string;
  reviewNotes: string | null;
  catalogNumber?: string | null;
  upc?: string | null;
  reviewIssues: { title: string | null; message: string | null; resolved: boolean }[];
}) {
  const feedback = [
    release.reviewNotes ? `Reviewer note:\n${release.reviewNotes}` : "",
    ...release.reviewIssues.filter((issue) => !issue.resolved).map((issue) => `${issue.title || "Review issue"}:\n${issue.message || "No further details supplied."}`),
  ].filter(Boolean).join("\n\n");
  return {
    initialSubject: `Changes required: ${release.title}`.slice(0, 160),
    initialCategory: "release",
    initialReference: release.catalogNumber?.trim() || release.upc?.trim() || "",
    initialBody: [
      `Release: ${release.title}\nRelease ID: ${release.id}`,
      "Please help me resolve the changes requested on this release.",
      `Review feedback (see release for full details):\n${feedback || "No detailed feedback is available on the release."}`,
    ].join("\n\n").slice(0, 7000) + "\n\nMy reply:\n",
  };
}
