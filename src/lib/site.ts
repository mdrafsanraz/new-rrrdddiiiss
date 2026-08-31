export const site = {
  name: "RDISTRO",
  tagline: "Get your music on every store.",
  email: "support@rdistro.net",
};

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export const stores = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Amazon Music",
  "Tidal",
  "Deezer",
  "TikTok",
  "Instagram",
  "Pandora",
  "SoundCloud",
] as const;

export const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    amount: 0,
    period: "forever",
    summary: "Start distributing with a light catalog cap.",
    features: [
      "1 artist",
      "5 releases per month",
      "Major stores",
      "10% optional revenue share",
    ],
    paid: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$19",
    amount: 19,
    period: "/year",
    summary: "Keep every royalty. Ship without a monthly cap.",
    features: [
      "1 artist",
      "Unlimited releases",
      "100% royalties",
      "Analytics",
      "Spotify and YouTube support",
    ],
    paid: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$39",
    amount: 39,
    period: "/year",
    summary: "For small labels that need speed and signal.",
    features: [
      "3 artists",
      "Unlimited releases",
      "Analytics",
      "Priority review",
    ],
    paid: true,
  },
] as const;

export type PlanId = (typeof plans)[number]["id"];

export function getPlan(id: string | null | undefined) {
  return plans.find((plan) => plan.id === id) ?? plans[0];
}

export const features = [
  {
    title: "One upload, every store",
    copy: "Send a release once. We route it to Spotify, Apple Music, YouTube, and 150+ stores your listeners already use.",
    illustration: "stores" as const,
  },
  {
    title: "Analytics that tell the story",
    copy: "Daily streams, trends, and audience insight in one dashboard. Know which track is moving before the playlist does.",
    illustration: "analytics" as const,
  },
  {
    title: "Splits without spreadsheets",
    copy: "Route royalties to producers, features, and your label automatically. Everyone gets paid without a group chat.",
    illustration: "royalty" as const,
  },
  {
    title: "A release queue you can trust",
    copy: "Live delivery status for every store. Priority review on Pro when the release date is locked.",
    illustration: "queue" as const,
  },
] as const;
