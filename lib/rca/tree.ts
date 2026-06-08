import { rcaQuestions } from "./mapping";
import type { RcaNode } from "./mapping";

export type TreeNode = {
  id: RcaNode;
  level: "L0" | "L1" | "L2-Traffic" | "L2-Conversion" | "L2-ASP" | "L3";
  question: string;
  children: RcaNode[];
};

function level(id: RcaNode): TreeNode["level"] {
  if (id.startsWith("L0")) return "L0";
  if (id.startsWith("L1")) return "L1";
  if (id.startsWith("L2-Traffic")) return "L2-Traffic";
  if (id.startsWith("L2-Conversion")) return "L2-Conversion";
  if (id.startsWith("L2-ASP")) return "L2-ASP";
  return "L3";
}

const tree: TreeNode[] = (Object.keys(rcaQuestions) as RcaNode[]).map((id) => ({
  id,
  level: level(id),
  question: rcaQuestions[id],
  children: childrenFor(id),
}));

function childrenFor(id: RcaNode): RcaNode[] {
  if (id === "L0: Quantify gap to plan") {
    return [
      "L1: Revenue attribution (Traffic × Conversion × ASP)",
      "L1: Identify top gap SKUs/categories",
      "L1: Units gap to isolate price impact",
    ];
  }
  if (id === "L1: Revenue attribution (Traffic × Conversion × ASP)") {
    return [
      "L2-Traffic: Is Organic GV down?",
      "L2-Traffic: Is Paid GV down?",
      "L2-Traffic: Is Organic SOV down?",
      "L2-Traffic: Is Paid SOV down?",
      "L2-Traffic: Ad Spend trending?",
      "L2-Traffic: Is Category Size shrinking?",
      "L2-Conversion: Is Availability% down?",
      "L2-Conversion: Inventory & Sellable Units",
      "L2-Conversion: POs and PO Fill Rate",
      "L2-Conversion: Is LBB% up?",
      "L2-Conversion: Is Content Score down?",
      "L2-Conversion: Is Promo Rate down?",
      "L2-Conversion: Badging changes?",
      "L2-Conversion: Ratings & Reviews down?",
      "L2-Conversion: Delivery timelines vs competitors?",
      "L2-ASP: Pricing trends",
    ];
  }
  if (id.startsWith("L2")) return ["L3: Top SKUs per broken metric"];
  return [];
}

export const rcaTree = tree;

export function getNode(id: RcaNode): TreeNode | undefined {
  return tree.find((n) => n.id === id);
}
