export type AlertCheckResult = "pass" | "fail" | "na";

export type AlertCheck = {
  label: string;
  result: AlertCheckResult;
};

export type SkuAlertItem = {
  id: string;
  kind:
    | "missing_promo_badge"
    | "lost_buy_box"
    | "buy_box_visibility"
    | "deal_page_visibility"
    | "coupon_detection"
    | "media_spend_anomaly"
    | "content_health";
  label: string;
  status: "open" | "ok" | "warning";
  summary: string;
  description?: string;
  checks?: AlertCheck[];
  priceCard?: {
    original: string;
    msrp?: string;
    selling: string;
    promoWindow?: string;
  };
  weeklySnapshot?: {
    label: string;
    issueCount: number;
    revenueImpact: number; // negative numbers are losses
    metrics: { label: string; numerator: number; denominator: number }[];
  };
};

export type SkuRow = {
  id: string;
  asin: string;
  brandSku: string;
  category: string;
  title: string;
  imageEmoji: string; // simple visual placeholder
  revenueImpact: number;
  tags: ("Promo Badge" | "Media Spend" | "Buy Box" | "Content" | "Pricing")[];
  alerts: SkuAlertItem[];
};

export type CategoryGroup = {
  id: string;
  name: string;
  totalImpact: number;
  skus: SkuRow[];
};

export type BrandAlertDataset = {
  brand: string;
  totalImpact: number;
  groups: CategoryGroup[];
};

const dollars = (n: number) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

function mkChecks(visible: boolean, origPrice: boolean): AlertCheck[] {
  return [
    { label: "Promo Badge Visible?", result: visible ? "pass" : "fail" },
    { label: "Original Price is Correct?", result: origPrice ? "pass" : "fail" },
    { label: "Selling Price is Correct?", result: "pass" },
    { label: "Original price is struck through?", result: "pass" },
  ];
}

function mkSnapshot(label: string, issues: number, impact: number) {
  return {
    label,
    issueCount: issues,
    revenueImpact: impact,
    metrics: [
      { label: "Promo Badge Missing", numerator: issues, denominator: 7 },
      { label: "Est. Revenue Impact", numerator: 7, denominator: 7 },
      { label: "List Price Mismatch", numerator: 0, denominator: 7 },
      { label: "Selling Price Mismatch", numerator: 0, denominator: 7 },
      { label: "List Price Visibility", numerator: 7, denominator: 7 },
      { label: "No Strikethrough on MSRP", numerator: 7, denominator: 7 },
    ],
  };
}

const sharkSkus: SkuRow[] = [
  {
    id: "sku-1",
    asin: "B09T4YZGQR",
    brandSku: "AV2511AE",
    category: "Robotics",
    title:
      "Shark Matrix Clean | Robot Vacuum Cleaner with Powerful Suction for Pet Hair, Rugs, Carpets & Hard Floors | Self-Empty Base | 60-Day Capacity",
    imageEmoji: "🤖",
    revenueImpact: -865800,
    tags: ["Promo Badge", "Media Spend"],
    alerts: [
      {
        id: "a-1",
        kind: "lost_buy_box",
        label: "Lost Buy Box",
        status: "ok",
        summary: "Buy box held by you for the full reporting window.",
      },
      {
        id: "a-2",
        kind: "missing_promo_badge",
        label: "Missing Promo Badge",
        status: "open",
        summary: "Your product is on discount from 7 Jun to 20 Jun, but there is some issue with the display.",
        checks: mkChecks(false, false),
        priceCard: { original: "$289.99", msrp: "$599.00", selling: "$289.99", promoWindow: "7 Jun – 20 Jun" },
        weeklySnapshot: mkSnapshot("Last week snapshot (May 31–Jun 6)", 7, -189883),
      },
      {
        id: "a-3",
        kind: "deal_page_visibility",
        label: "Deal Page Visibility",
        status: "ok",
        summary: "Featured on the deal page consistently.",
      },
      {
        id: "a-4",
        kind: "coupon_detection",
        label: "Coupon Detection",
        status: "ok",
        summary: "No coupon detected for this period.",
      },
    ],
  },
  {
    id: "sku-2",
    asin: "B09H8CWFNK",
    brandSku: "AV2501S",
    category: "Robotics",
    title: "Shark AV2501S AI Ultra Robot Vacuum, with Matrix Clean, Home Mapping, 30-Day Capacity Self-Empty Base",
    imageEmoji: "🤖",
    revenueImpact: -394000,
    tags: ["Buy Box", "Media Spend"],
    alerts: [
      {
        id: "a-1",
        kind: "lost_buy_box",
        label: "Lost Buy Box",
        status: "open",
        summary: "3P seller took buy box for 18 of 24 hours yesterday at a $4.20 lower price.",
        checks: [
          { label: "Price is competitive?", result: "fail" },
          { label: "FBA eligible?", result: "pass" },
          { label: "Inventory healthy?", result: "pass" },
          { label: "MAP enforced?", result: "fail" },
        ],
        priceCard: { original: "$449.99", selling: "$445.79" },
        weeklySnapshot: mkSnapshot("Last week snapshot (May 31–Jun 6)", 5, -82500),
      },
      {
        id: "a-2",
        kind: "media_spend_anomaly",
        label: "Media Spend Anomaly",
        status: "warning",
        summary: "ad spend −24% PvP; iROAS slipping on franchise SKUs.",
      },
    ],
  },
  {
    id: "sku-3",
    asin: "B0F2GSS65D",
    brandSku: "RV2120AE",
    category: "Robotics",
    title: "Shark Navigator Robot Vacuum and Self-Empty Base with Bagless 60-Day Capacity Self-Empty Base",
    imageEmoji: "🤖",
    revenueImpact: -181200,
    tags: ["Media Spend", "Promo Badge", "Buy Box"],
    alerts: [
      {
        id: "a-1",
        kind: "missing_promo_badge",
        label: "Missing Promo Badge",
        status: "open",
        summary: "Promo live but badge is intermittently missing.",
        checks: mkChecks(false, true),
        priceCard: { original: "$199.99", msrp: "$349.00", selling: "$199.99", promoWindow: "1 Jun – 14 Jun" },
        weeklySnapshot: mkSnapshot("Last week snapshot (May 31–Jun 6)", 4, -42100),
      },
    ],
  },
  {
    id: "sku-4",
    asin: "B005KMDV9A",
    brandSku: "NV356E 26",
    category: "Uprights",
    title: "Shark Upright Vacuum Cleaner | Navigator Lift-Away | Pet Hair, Carpet & Hard Floor Cleaning",
    imageEmoji: "🧹",
    revenueImpact: -802500,
    tags: ["Media Spend"],
    alerts: [
      {
        id: "a-1",
        kind: "media_spend_anomaly",
        label: "Media Spend Anomaly",
        status: "open",
        summary: "iROAS dropped −36% vs prior week on branded campaigns.",
      },
    ],
  },
  {
    id: "sku-5",
    asin: "B00JH98GR4",
    brandSku: "NV360",
    category: "Uprights",
    title: "Shark Upright Vacuum Cleaner | Navigator Lift-Away Deluxe | Pet Hair, Carpet & Hard Floor",
    imageEmoji: "🧹",
    revenueImpact: -286700,
    tags: ["Content"],
    alerts: [
      {
        id: "a-1",
        kind: "content_health",
        label: "Content Health",
        status: "open",
        summary: "A+ content missing on mobile; bullets are below the 5 minimum.",
      },
    ],
  },
];

export const sharkAlerts: BrandAlertDataset = {
  brand: "Shark",
  totalImpact: -7_400_000,
  groups: [
    {
      id: "robotics",
      name: "Robotics",
      totalImpact: -2_000_000,
      skus: sharkSkus.filter((s) => s.category === "Robotics"),
    },
    {
      id: "uprights",
      name: "Uprights",
      totalImpact: -1_500_000,
      skus: sharkSkus.filter((s) => s.category === "Uprights"),
    },
  ],
};

const ninjaSkus: SkuRow[] = [
  {
    id: "sku-n1",
    asin: "B0BTMS73C8",
    brandSku: "FD402",
    category: "Kitchen Systems",
    title: "Ninja Foodi 10-in-1 XL Pro Air Fry Oven, Large Countertop Convection Oven",
    imageEmoji: "🍳",
    revenueImpact: -312000,
    tags: ["Promo Badge"],
    alerts: [
      {
        id: "a-1",
        kind: "missing_promo_badge",
        label: "Missing Promo Badge",
        status: "open",
        summary: "Promo live but badge missing on category page.",
        checks: mkChecks(false, true),
        priceCard: { original: "$229.99", msrp: "$329.99", selling: "$229.99", promoWindow: "5 Jun – 19 Jun" },
        weeklySnapshot: mkSnapshot("Last week snapshot (May 31–Jun 6)", 5, -63100),
      },
    ],
  },
];

export const ninjaAlerts: BrandAlertDataset = {
  brand: "Ninja",
  totalImpact: -680_000,
  groups: [
    {
      id: "kitchen",
      name: "Kitchen Systems",
      totalImpact: -680_000,
      skus: ninjaSkus,
    },
  ],
};

export const brandAlerts: Record<string, BrandAlertDataset> = {
  Shark: sharkAlerts,
  Ninja: ninjaAlerts,
};

export const formatDollars = dollars;
