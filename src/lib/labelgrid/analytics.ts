import { labelgridFetch } from "@/lib/labelgrid/client";

export const ANALYTICS_PLATFORMS = [
  "SPOTIFY",
  "APPLE_MUSIC",
  "ITUNES",
  "AMAZON",
  "DEEZER",
  "BOOMPLAY",
  "AUDIOMACK",
  "AWA",
] as const;

export type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

type AnalyticsResponse = {
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  availability?: Record<string, string>;
};

type RowsResponse = { data?: unknown[]; availability?: string };

export async function getReleaseAnalytics(input: {
  labelgridReleaseId: number;
  startDate: string;
  endDate: string;
  platform?: AnalyticsPlatform;
}) {
  const scope = {
    "filter[start_date]": input.startDate,
    "filter[end_date]": input.endDate,
    "filter[release_id]": input.labelgridReleaseId,
    ...(input.platform ? { "filter[platform]": input.platform } : {}),
  };

  const [summary, leaders, placements] = await Promise.all([
    labelgridFetch<AnalyticsResponse>("/analytics/summary", {
      searchParams: {
        ...scope,
        "metrics[]": [
          "streams",
          "listeners",
          "saves",
          "skips",
          "streams-by-country",
        ],
        limit: 10,
      },
    }),
    labelgridFetch<RowsResponse>("/analytics/leaderboards", {
      searchParams: { ...scope, type: "tracks", limit: 8 },
    }),
    labelgridFetch<RowsResponse>("/analytics/placements", {
      searchParams: { ...scope, limit: 8 },
    }),
  ]);

  return {
    sections: summary.data ?? {},
    meta: summary.meta ?? {},
    availability: summary.availability ?? {},
    leaders: Array.isArray(leaders.data) ? leaders.data : [],
    placements: Array.isArray(placements.data) ? placements.data : [],
  };
}
