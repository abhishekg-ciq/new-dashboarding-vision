# Widget Editing & Adding — User Surface

## Governing principle

User widget capabilities are gated on a single axis: **consuming the semantic layer vs. modifying the data model.** Everything a user does — pick a metric, break down by a dimension, toggle a benchmark, add a widget from a vetted source, ask Ally to build one — *consumes* the semantic layer and is governed by the metric-dimension compatibility matrix, so it cannot produce a structurally invalid or misconfigured widget. Anything that *binds or repairs the underlying data model* (selecting a raw data source, forcing a visualization the data doesn't support, defining a new metric) can produce wrong or misleading output and therefore stays with CSM/FDE.

A consequence that shapes both sections below: a user never selects a "data source," and never selects a visualization from the full library. Adding a widget is not a configuration task; it is a consumption task that resolves source and visualization on the user's behalf.

---

## 1. Edit Widget (User)

> *As a user, I want to edit widgets on my dashboard — rename, add/remove/change metrics, change dimensions, toggle % contribution and benchmark — so I can tailor the view to my analysis without rebuilding anything.*

### 1.1 In scope for users (Tier 1 — inline)

| Capability | Behaviour |
| :---- | :---- |
| Rename widget | Click title → edit inline → auto-save. |
| Add / remove / change metric | "+Add metric" chip; remove via metric menu. Available metrics are those that exist in the semantic layer and are compatible with the widget's current dimension and grain. AI may suggest metrics by context. |
| Add / change dimension | Inline dimension dropdown. Switch one dimension (e.g. Brand → SKU) or add a second. Options are filtered by the metric-dimension compatibility matrix. |
| Toggle % contribution | Shows each row's share of the displayed total. Computed from the semantic layer. |
| Toggle benchmark | Overlays the relevant benchmark series (category average / plan / prior period). Computed from the semantic layer. |
| Change visualization — *constrained* | A user may switch only between visualizations the current metric × dimension × grain validly supports (e.g. line ↔ bar for a single metric over time; table is always available). The full library and any unsupported combination are not offered. |
| Remove widget | With confirmation. Applies only to personal / cloned dashboards. |

### 1.2 Explicitly not in scope for users

- **Change data source.** Users never select or change a data source; the metric the user picks already resolves to a governed source, grain, and valid-dimension set. The data-source selector exists only in the CSM/FDE full panel to repair a misconfigured widget.
- **Arbitrary visualization override.** Selecting a visualization the data does not support (e.g. forcing a scatter on a single-metric series) is a CSM/FDE capability. Users get only the constrained, valid subset described above.

### 1.3 Flow — edit a metric on an existing widget

1. User hovers a widget on a dashboard they can edit (personal or cloned).
2. User clicks **+Add metric** → a context-ranked list of compatible metrics appears (semantic-layer metrics valid for the current dimension and grain).
3. User selects a metric → widget recomputes and re-renders in place; visualization stays the same unless the new metric set makes the current visualization invalid, in which case the platform falls back to the nearest valid default and indicates the change.
4. Change auto-saves to the user's copy.

*Alternative path:* the user asks Ask Ally "add conversion rate to this chart"; Ally resolves the metric and applies the same edit, subject to the same compatibility constraints.

### 1.4 Constraints

- Edits should persist only on **personal or cloned** dashboards. Canonical dashboards published by a CSM should be read-only to users; attempting to edit one should prompt the user to make a copy first.
- Every metric, dimension, and benchmark surfaced to the user should resolve to a semantic-layer definition. A metric or dimension absent from the semantic layer should not appear as an option.
- Dimension and visualization options should be derived from the metric-dimension compatibility matrix at render time, so an invalid combination is never selectable rather than selectable-then-errored.
- All edits should auto-save without an explicit save action.
- % contribution and benchmark are display toggles only; they should not alter the widget's underlying query result, only its presentation.

### 1.5 Acceptance criteria

- [ ] A user can rename, add/remove/change a metric, change a dimension, and toggle % contribution and benchmark on a widget on a personal or cloned dashboard, with each change auto-saving.
- [ ] A user is never shown a data-source selector anywhere in the user edit surface.
- [ ] The visualization control offered to a user contains only visualizations valid for the current metric × dimension × grain; no unsupported option is selectable.
- [ ] Dimension options reflect the compatibility matrix for the active metric; incompatible dimensions are not offered.
- [ ] Editing a canonical (CSM-published) dashboard is blocked and the user is offered "Make a copy" instead.
- [ ] Removing a metric that the visualization depends on either re-renders to a valid default or removes the widget, never leaving an empty or errored widget.

---

## 2. Add Widget (User)

> *As a user, I want to add a widget to my dashboard so I can see the information I care about — without configuring a data source or picking a chart type.*

Users add widgets through three entry points, none of which exposes a data-source selector or a full visualization picker. Source and visualization are resolved by the platform.

### 2.1 Entry points

| Entry point | Tier | What the user does | What the platform resolves |
| :---- | :---- | :---- | :---- |
| **From catalog** | T1 → T2 | Picks a pre-built, semantically-validated widget from a curated catalog and places it. | Nothing to resolve — source, metrics, and visualization were already defined by CSM/FDE. |
| **Via Ask Ally** | T1 (via chat) | Describes the widget in natural language ("add a promo-lift-by-SKU widget"). | Ally resolves the metric(s) from the semantic layer, applies the default visualization, returns a previewed widget the user pins. |
| **Metric-first** | T1 inline | Picks a metric (and optionally a dimension). | Source is pre-bound to the metric; visualization auto-defaults from the compatibility matrix. |

### 2.2 Default-visualization resolution

When the platform selects a visualization on the user's behalf, it should apply deterministic defaults from the compatibility matrix, for example: a single metric over time → line; a metric by a categorical dimension → bar; a single point-in-time value → KPI card; two metrics across an entity set → scatter; a metric with a breakdown the user wants to inspect row-by-row → table. The user may then adjust within the *constrained* visualization set per §1.1.

### 2.3 Flow — add via catalog

1. User clicks **Add widget** on a personal or cloned dashboard.
2. The widget catalog opens, scoped to widgets valid for the dashboard's taxonomy and the user's data entitlements.
3. User selects a widget and places it; it inherits the dashboard's active filters and date range.
4. Widget auto-saves to the user's copy.

### 2.4 Flow — add via Ask Ally

1. User opens Ask Ally and describes the widget, or asks a question whose answer is a chart/table.
2. Ally resolves the metric(s) and dimension from the semantic layer and renders a preview with the default visualization.
3. User pins the result to the current dashboard (or a new one); it is added as an editable widget subject to §1.
4. Widget auto-saves to the user's copy.

### 2.5 Flow — add metric-first

1. User clicks **Add widget → Start from a metric**.
2. User selects a metric from the semantic layer (search / suggested). Optionally selects one dimension; both are constrained by the compatibility matrix.
3. The platform applies the default visualization and renders the widget in place.
4. Widget auto-saves; user may refine via §1 affordances.

### 2.6 Constraints

- The user add-widget surface should never present a data-source selector or the full visualization library. If a user needs a source or visualization the consumption paths cannot satisfy, that is a CSM/FDE request, not a user action.
- Only metrics and dimensions registered in the semantic layer should be addable; the catalog and the metric picker should both draw from it.
- A newly added widget should inherit the dashboard's active filters, date range, and taxonomy by default.
- Adding is permitted on **personal or cloned** dashboards. Users should not be able to add widgets to a canonical dashboard; the flow should route them to make a copy first.
- The default visualization should be deterministic for a given metric × dimension × grain, so the same intent produces the same widget.

### 2.7 Acceptance criteria

- [ ] A user can add a widget via catalog, via Ask Ally, and metric-first, and in none of these is a data-source selector or full visualization picker shown.
- [ ] A widget added via any path renders with a valid default visualization and inherits the dashboard's active filters and date range.
- [ ] Only semantic-layer-registered metrics and dimensions are selectable in the metric-first path and surfaced in the catalog.
- [ ] An Ask Ally answer can be pinned as an editable widget that then supports the §1 edit affordances.
- [ ] Adding a widget to a canonical dashboard is blocked and the user is offered "Make a copy" instead.
- [ ] The same natural-language or metric-first request produces the same default visualization on repeat.

---

*Open items to confirm: (1) whether the catalog is curated per-account by CSM or drawn globally from all validated widgets; (2) whether the constrained visualization toggle set is defined centrally in the compatibility matrix or per-widget-type; (3) entitlement model for which semantic-layer metrics a given user can see in the metric-first picker.*
