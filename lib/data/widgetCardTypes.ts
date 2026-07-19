export type WidgetCardIntent = "scorecard" | "trend" | "breakdown";
export type WidgetCardShape =
  | "kpi_cards"
  | "line"
  | "bar"
  | "stacked_bar"
  | "table"
  | "time_matrix"
  | "pie";
export type WidgetCardMoment = "monitor" | "diagnose" | "opportunity";

export type WidgetCard = {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  intent: WidgetCardIntent;
  default_shape: WidgetCardShape;
  metrics: string[];
  default_dimension: string | null;
  filter_hint?: string;
  moment: WidgetCardMoment;
  search_tags: string[];
  source_report?: string;
};
