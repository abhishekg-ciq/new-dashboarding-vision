/**
 * Ported verbatim from mapping.seed.ts (the v1 Metric-to-Requirement Mapping Tool
 * extraction). This is the invariant client domain logic for:
 *   - the L0-L3 RCA tree
 *   - the 20 alert types
 *   - the keyword table binding a metric to RCA nodes + alerts
 *
 * Edit by appending to `mappingRules`, not by mutating existing entries.
 */

// L0–L3 RCA Questions
export const rcaQuestions = {
  "L0: Quantify gap to plan":
    "How far off plan are we? What's the pacing trajectory?",
  "L1: Revenue attribution (Traffic × Conversion × ASP)":
    "Which of Traffic, Conversion, ASP, Catalog Change account for ≥80% of the gap?",
  "L1: Identify top gap SKUs/categories":
    "Which categories have largest dollar shortfall? Which SKUs within those have biggest attainment gaps?",
  "L1: Units gap to isolate price impact":
    "Check units gap to separate volume vs price effects",
  "L2-Traffic: Is Organic GV down?":
    "Organic Glance Views trend vs plan/prior period",
  "L2-Traffic: Is Organic SOV down?":
    "Organic SOV trend; which keywords losing SOV; which SKUs dropped rank",
  "L2-Traffic: Is Paid GV down?": "Paid Glance Views / Paid Traffic trend",
  "L2-Traffic: Is Paid SOV down?":
    "Paid SOV trend; keywords losing SOV; competitor SOV gainers",
  "L2-Traffic: Ad Spend trending?":
    "Ad Spend level, direction; spend on ineligible ASINs; iRoAS/RoAS trend",
  "L2-Traffic: Is Category Size shrinking?":
    "Category size trend; seasonal vs anomalous; Market Share trend",
  "L2-Conversion: Is Availability% down?":
    "Availability% trend; days available; revenue lost to unavailability",
  "L2-Conversion: Inventory & Sellable Units":
    "Inventory level; On-hand sellable units; damaged/SnS-tagged units",
  "L2-Conversion: POs and PO Fill Rate":
    "PO volume trend; PO fill rate; seasonality vs CRaP vs direct fulfillment",
  "L2-Conversion: Is LBB% up?":
    "Lost Buy Box% trend; days LBB; 3P winners & pricing; delivery timelines",
  "L2-Conversion: Is Content Score down?":
    "Content Score trend; title/image/bullets/desc/A+/PIM compliance breakdown",
  "L2-Conversion: Is Promo Rate down?":
    "Promo rate trend; days on promo; promo type & value; promo-based sales",
  "L2-Conversion: Badging changes?":
    "Badging% trend; Prime/AC/BSR/CPF/Frequently Returned badge status; dates of change",
  "L2-Conversion: Ratings & Reviews down?":
    "Ratings trend; star distribution; review sentiment",
  "L2-Conversion: Delivery timelines vs competitors?":
    "Your delivery timelines; competitor timelines; localized inventory",
  "L2-ASP: Pricing trends":
    "ASP trend; category average ASP; competitor pricing; new entrants",
  "L3: Top SKUs per broken metric":
    "Top 5 SKUs ranked by gap contribution per flagged L2 metric",
} as const;

export type RcaNode = keyof typeof rcaQuestions;

export const alertNames = [
  "Gap to Plan alert (weekly/daily threshold breach)",
  "Category attainment drop alert",
  "SKU attainment gap alert (top N SKUs)",
  "Availability% drop alert",
  "Lost Buy Box% spike alert",
  "Content Score degradation alert",
  "Promo rate change alert",
  "Badge lost/gained alert (Prime, AC, BSR, CPF, Freq Returned)",
  "Rating/review sentiment shift alert",
  "Organic SOV drop alert (keyword-level)",
  "Paid SOV drop alert (keyword-level)",
  "Ad Spend anomaly alert (iRoAS/RoAS deterioration)",
  "ASP change alert (own + category avg)",
  "Inventory/PO shortfall alert",
  "Delivery timeline degradation alert",
  "Category size contraction alert",
  "BSR trend alert",
  "Buy Box suppression alert",
  "Deal badging / deals page ranking alert",
  "Substitution / variation grouping change alert",
] as const;

export type AlertName = (typeof alertNames)[number];

export type MappingRule = {
  keywords: string[];
  rca: RcaNode[];
  alerts: AlertName[];
};

export const mappingRules: MappingRule[] = [
  { keywords: ["ordered_revenue", "revenue", "ordered_product_sales", "ops", "shipped_revenue", "net_sales", "plan", "goal", "attainment", "gap", "target"], rca: ["L0: Quantify gap to plan", "L1: Revenue attribution (Traffic × Conversion × ASP)"], alerts: ["Gap to Plan alert (weekly/daily threshold breach)"] },
  { keywords: ["ordered_units", "units_ordered", "shipped_units", "unit_count", "units"], rca: ["L1: Units gap to isolate price impact", "L1: Identify top gap SKUs/categories"], alerts: ["SKU attainment gap alert (top N SKUs)"] },
  { keywords: ["asp", "average_selling_price", "average_sales_price", "avg_price", "average_price"], rca: ["L2-ASP: Pricing trends", "L1: Revenue attribution (Traffic × Conversion × ASP)"], alerts: ["ASP change alert (own + category avg)"] },
  { keywords: ["category_asp", "cat_asp", "market_asp", "competitor_price", "category_average"], rca: ["L2-ASP: Pricing trends"], alerts: ["ASP change alert (own + category avg)"] },
  { keywords: ["glance_view", "glance_views", "gv", "page_view", "pdp_view", "detail_page"], rca: ["L2-Traffic: Is Organic GV down?", "L2-Traffic: Is Paid GV down?", "L1: Revenue attribution (Traffic × Conversion × ASP)"], alerts: [] },
  { keywords: ["organic_glance", "organic_gv", "organic_traffic", "organic_page_view"], rca: ["L2-Traffic: Is Organic GV down?"], alerts: [] },
  { keywords: ["paid_glance", "paid_gv", "paid_traffic", "paid_click", "sp_click", "sb_click", "sd_click", "sbv_click", "click"], rca: ["L2-Traffic: Is Paid GV down?"], alerts: [] },
  { keywords: ["sov", "share_of_voice", "share_of_search", "search_share", "sos"], rca: ["L2-Traffic: Is Organic SOV down?", "L2-Traffic: Is Paid SOV down?"], alerts: ["Organic SOV drop alert (keyword-level)", "Paid SOV drop alert (keyword-level)"] },
  { keywords: ["organic_sov", "organic_share", "organic_rank", "search_rank", "organic_position"], rca: ["L2-Traffic: Is Organic SOV down?"], alerts: ["Organic SOV drop alert (keyword-level)"] },
  { keywords: ["paid_sov", "paid_share", "sponsored_rank", "paid_position", "paid_rank"], rca: ["L2-Traffic: Is Paid SOV down?"], alerts: ["Paid SOV drop alert (keyword-level)"] },
  { keywords: ["ad_spend", "spend", "advertising_spend", "media_spend", "cost", "acos", "tacos"], rca: ["L2-Traffic: Ad Spend trending?"], alerts: ["Ad Spend anomaly alert (iRoAS/RoAS deterioration)"] },
  { keywords: ["roas", "iroas", "return_on_ad", "ad_return", "advertising_return"], rca: ["L2-Traffic: Ad Spend trending?"], alerts: ["Ad Spend anomaly alert (iRoAS/RoAS deterioration)"] },
  { keywords: ["impression", "impr"], rca: ["L2-Traffic: Is Paid GV down?", "L2-Traffic: Is Paid SOV down?"], alerts: ["Paid SOV drop alert (keyword-level)"] },
  { keywords: ["cpc", "cost_per_click", "bid", "avg_cpc"], rca: ["L2-Traffic: Ad Spend trending?"], alerts: ["Ad Spend anomaly alert (iRoAS/RoAS deterioration)"] },
  { keywords: ["ctr", "click_through", "clickthrough"], rca: ["L2-Traffic: Is Paid GV down?"], alerts: [] },
  { keywords: ["category_size", "market_size", "market_share", "category_share", "total_market"], rca: ["L2-Traffic: Is Category Size shrinking?"], alerts: ["Category size contraction alert"] },
  { keywords: ["conversion", "unit_conversion", "conversion_rate", "cvr", "ucr"], rca: ["L1: Revenue attribution (Traffic × Conversion × ASP)", "L2-Conversion: Is Availability% down?"], alerts: [] },
  { keywords: ["availability", "avail", "in_stock", "oos", "out_of_stock", "stockout"], rca: ["L2-Conversion: Is Availability% down?"], alerts: ["Availability% drop alert"] },
  { keywords: ["inventory", "inv_", "sellable", "on_hand", "warehouse"], rca: ["L2-Conversion: Inventory & Sellable Units"], alerts: ["Inventory/PO shortfall alert"] },
  { keywords: ["purchase_order", "po_", "po_fill", "fill_rate", "replenishment"], rca: ["L2-Conversion: POs and PO Fill Rate"], alerts: ["Inventory/PO shortfall alert"] },
  { keywords: ["buy_box", "buybox", "lbb", "lost_buy_box", "bb_", "featured_offer"], rca: ["L2-Conversion: Is LBB% up?"], alerts: ["Lost Buy Box% spike alert", "Buy Box suppression alert"] },
  { keywords: ["content_score", "content_health", "content_quality", "title_score", "image_score", "bullet", "a_plus", "aplus", "description_score", "pim", "compliance", "rich_content"], rca: ["L2-Conversion: Is Content Score down?"], alerts: ["Content Score degradation alert"] },
  { keywords: ["promo", "promotion", "coupon", "deal", "discount", "voucher", "lightning_deal", "best_deal", "subscribe_save", "sns"], rca: ["L2-Conversion: Is Promo Rate down?"], alerts: ["Promo rate change alert", "Deal badging / deals page ranking alert"] },
  { keywords: ["badge", "badging", "prime_badge", "amazon_choice", "best_seller", "climate_pledge", "frequently_returned", "bsr", "best_seller_rank"], rca: ["L2-Conversion: Badging changes?"], alerts: ["Badge lost/gained alert (Prime, AC, BSR, CPF, Freq Returned)", "BSR trend alert"] },
  { keywords: ["rating", "review", "star", "sentiment", "voice_of_customer", "return_rate", "customer_feedback"], rca: ["L2-Conversion: Ratings & Reviews down?"], alerts: ["Rating/review sentiment shift alert"] },
  { keywords: ["delivery", "shipping", "fulfillment", "ship_window", "lead_time", "transit", "sla"], rca: ["L2-Conversion: Delivery timelines vs competitors?"], alerts: ["Delivery timeline degradation alert"] },
  { keywords: ["price", "pricing", "list_price", "selling_price", "retail_price", "vrp", "map", "msrp", "minimum_advertised"], rca: ["L2-ASP: Pricing trends"], alerts: ["ASP change alert (own + category avg)"] },
  { keywords: ["catalog", "asin_count", "sku_count", "active_asin", "new_asin", "deprecated", "npd", "new_product"], rca: ["L3: Top SKUs per broken metric"], alerts: ["Substitution / variation grouping change alert"] },
  { keywords: ["3p", "third_party", "seller", "3rd_party", "unauthorized", "reseller"], rca: ["L2-Conversion: Is LBB% up?"], alerts: ["Lost Buy Box% spike alert"] },
  { keywords: ["suppress", "suppression", "search_suppress"], rca: ["L2-Conversion: Is Availability% down?", "L2-Conversion: Is LBB% up?"], alerts: ["Buy Box suppression alert"] },
  { keywords: ["keyword", "search_term", "search_volume", "query"], rca: ["L2-Traffic: Is Organic SOV down?", "L2-Traffic: Is Paid SOV down?"], alerts: ["Organic SOV drop alert (keyword-level)", "Paid SOV drop alert (keyword-level)"] },
  { keywords: ["order", "number_of_order", "orders_count"], rca: ["L0: Quantify gap to plan", "L1: Units gap to isolate price impact"], alerts: ["Gap to Plan alert (weekly/daily threshold breach)"] },
  { keywords: ["competitor", "comp_", "competitive"], rca: ["L2-ASP: Pricing trends", "L2-Traffic: Is Category Size shrinking?"], alerts: ["Category size contraction alert"] },
  { keywords: ["lost_revenue", "revenue_loss", "rev_lost", "missed_revenue", "lost_sales"], rca: ["L2-Conversion: Is Availability% down?", "L2-Conversion: Is LBB% up?"], alerts: ["Availability% drop alert", "Lost Buy Box% spike alert"] },
  { keywords: ["subscribe", "subscription", "sns_", "s_and_s"], rca: ["L2-Conversion: Inventory & Sellable Units"], alerts: [] },
  { keywords: ["profit", "margin", "crap", "cogs", "gross_margin", "contribution", "net_ppm"], rca: ["L2-Conversion: POs and PO Fill Rate"], alerts: [] },
  { keywords: ["variation", "parent", "child", "grouping", "asin_family"], rca: ["L3: Top SKUs per broken metric"], alerts: ["Substitution / variation grouping change alert"] },
  { keywords: ["forecast", "predicted", "projection", "expected", "pace", "pacing", "run_rate"], rca: ["L0: Quantify gap to plan"], alerts: ["Gap to Plan alert (weekly/daily threshold breach)"] },
  { keywords: ["ad_sales", "attributed_sales", "ad_revenue", "advertising_sales", "sp_sales", "sb_sales", "sd_sales", "sbv_sales", "ntb", "new_to_brand"], rca: ["L2-Traffic: Ad Spend trending?"], alerts: ["Ad Spend anomaly alert (iRoAS/RoAS deterioration)"] },
  { keywords: ["session", "dpv", "detail_page_view", "unique_visitor", "browser_session"], rca: ["L2-Traffic: Is Organic GV down?", "L2-Traffic: Is Paid GV down?"], alerts: [] },
  { keywords: ["checkout", "cart", "add_to_cart", "atc"], rca: ["L1: Revenue attribution (Traffic × Conversion × ASP)"], alerts: [] },
  { keywords: ["share", "market_share", "dollar_share", "unit_share", "volume_share"], rca: ["L2-Traffic: Is Category Size shrinking?"], alerts: ["Category size contraction alert"] },
];

export type MetricMapping = {
  required: "Y" | "N";
  rcaUseCases: RcaNode[];
  alerts: AlertName[];
};

export function mapMetric(
  backendName: string,
  metricName: string,
  definition: string,
): MetricMapping {
  const searchText = `${backendName} ${metricName} ${definition}`.toLowerCase();
  const rcaSet = new Set<RcaNode>();
  const alertSet = new Set<AlertName>();

  for (const rule of mappingRules) {
    const matched = rule.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
    if (matched) {
      rule.rca.forEach((r) => rcaSet.add(r));
      rule.alerts.forEach((a) => alertSet.add(a));
    }
  }

  const rcaArr = Array.from(rcaSet);
  const alertArr = Array.from(alertSet);
  const required: "Y" | "N" = rcaArr.length > 0 || alertArr.length > 0 ? "Y" : "N";
  return { required, rcaUseCases: rcaArr, alerts: alertArr };
}
