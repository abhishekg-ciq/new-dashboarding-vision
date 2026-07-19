**Chat-Based Dashboarding**

Product Requirements Document

v7.0 · July 2026 · Abhishek G.

*Status: Draft for review*

## **1\. Problem Statement**

Two problems drive this work.

**Problem 1 — Engineering is in the loop for every new view.** Today, every new visualization, every template creation, and every customization to an existing template has to involve engineering. There is no self-serve path for a new analytical view; the work queues behind an eng ticket, which is slow and doesn't scale — a Target-style account with hundreds of brand/category combinations cannot have a view hand-built per combination.

**Problem 2 — Users must build views without knowing what's available.** To get a non-standard view today, a user has to go through the process of creating a new widget or dashboard for the analysis — and in many cases they don't know which metrics, dimensions, or visualizations to reference, nor do they have a working understanding of the platform's capabilities. The tooling assumes the user already knows what exists.

Chat lets users bypass both. Rather than knowing the catalog and assembling a view, a user simply states their problem in plain language and gets a solution — a widget or dashboard assembled for them, grounded in governed metrics. It serves the analyst mid-investigation, the VP who wants a view without learning the builder, and the FDE standing up a client view — without forcing anyone to master the control surface or wait on a ticket.

The cost of not solving it: chat stays a read-only Q\&A surface, the daily topical/threshold analysis gap stays open, and every non-standard view remains an engineering or FDE ticket.

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **2\. Goals**

**What this PRD contains?**

![][image1]

| \# | Goal | Type | Target |
| ----- | :---- | :---- | :---- |
| G1 | A user can go from a natural-language request to a rendered, saveable widget without touching a configuration control | Capability | Live for both personas (v1) |
| G2 | Chat-created widgets are first-class — editable, filterable, viz-toggleable via chat **and** UI, like any other widget | Quality | 100% parity with UI-built widgets |
| G3 | End users can safely self-serve dashboards without confronting grain, global-filter, or metric-governance decisions | Safety/UX | No end-user exposure to grain resolution |
| G4 | Remove engineering from the loop for in-catalog view creation and customization | Efficiency | Measured 60 days post-launch |
| G5 | Strong weekly active usage of chat creation/edit among active dashboard users | Engagement | Measured 60 days post-launch |

## **3\. Non-Goals**

| Non-Goal | Rationale |
| :---- | :---- |
| Metric creation or source binding via chat | Users consume the semantic layer; they never model it. Defining a metric, binding a source, or registering a custom dimension stays FDE-via-code. |
| Saving widgets built on ungoverned/derived metrics | A widget persists only if all its metrics/dimensions are registered in the semantic layer (INV-8). Derived or unregistered metrics render as ephemeral chat answers with a disclaimer and route to the FDE-request path — they cannot be saved or edited. |
| Multi-source fusion inside one widget | One source per widget holds (INV-5). Multiple single-source widgets can sit on one dashboard; they cannot be joined into one chart. |
| Ungoverned visualization | Viz is governed but eligibility-gated (INV-4): a viz type is offered whenever the widget's config can correctly feed it, drawn from the platform's supported chart library (Vega-based). Chart types absent from that library route to FDE. |
| End-user blank-canvas dashboard authoring | End users create dashboards by instantiating FDE templates, not from blank. Blank-canvas authoring is an FDE capability because it requires resolving grain and global filters. |
| Mixed-grain / custom-UI / fixed FDE dashboards | Bespoke multi-grain dashboards with custom UI are a separate, later effort — flagged, not specified here. |
| Delete via chat | Deferred to v2+. |
| Actions beyond dashboarding | Applying alerts, pushing to external systems, or triggering agentic workflows through this surface is out of scope. |
| Prescribing the generation/compute implementation | How the system parses, computes, and enforces grounding is an engineering decision. This PRD specifies user-facing behavior and outcomes only. |

## **4\. Users**

**End users (client-side)** — brand analysts, account managers, sales directors, VPs. They instantiate templates, add/edit/filter widgets, and rearrange their own dashboards. They *use* global filters and *consume* the semantic layer; they never define global filters, resolve grain, or curate the metric set.

**CIQ Internal — referred to throughout as "FDE"** (covers FDE / PM / CSM). Superset of the end-user capabilities, **plus**: author dashboards/templates from blank, define global filter sets, curate the eligible-metric subset per source, and publish templates/dashboards to one, several, or all clients. They cannot create metrics or bind sources via chat (that stays FDE-via-code).

**Chat \+ UI parity.** Everything a user can do to a widget via chat, they can also do via the UI (edit metrics/dimensions, change filters, toggle visualization). Chat is an additional, faster surface — not a replacement for UI controls. Some operations are **UI-only** where a conversational surface adds no value or where direct manipulation is clearer (e.g., placing a widget onto a dashboard, rearranging layout). Each story below notes its surface(s).

**Capability matrix (summary; full detail in §5):**

| Capability | Surface | End user | FDE |
| :---- | ----- | ----- | ----- |
| Ask & answer (read-only) | Chat | ✅ | ✅ |
| Create widget | Chat \+ UI | ✅ | ✅ |
| Edit widget (metric/dim, filter, viz) | Chat \+ UI | ✅ | ✅ |
| Instantiate a template → own dashboard | Chat \+ UI | ✅ | ✅ |
| Add widget to a dashboard (placement) | UI | ✅ | ✅ |
| Remove / rearrange widgets | UI | ✅ | ✅ |
| Clone a canonical dashboard to personal | Chat \+ UI | ✅ | ✅ |
| Author a dashboard/template from blank | Chat \+ UI | ❌ | ✅ |
| Define a dashboard's global filter set | UI | ❌ | ✅ |
| Curate eligible-metric subset per source | UI | ❌ | ✅ |
| Publish template/dashboard to clients (one/many/all) | UI | ❌ | ✅ |
| Create metric / bind source | — | ❌ | ❌ (FDE-via-code) |

## **5\. User Stories, Acceptance Criteria & Requirements**

Stories are grouped into four categories: **Shared Foundation** (§5.1), **Dashboard creation** (§5.2, FDE only), **Dashboard edits** (§5.3, both personas), and **Widget Operations** (§5.4, both personas). §5.0 lists all stories with category and target version. Shared contracts (invariants, reference tables) live in the appendices and are referenced throughout.

### **5.0 User Story Summary**

| ID | Title | Category | Surface | Persona | Version |
| ----- | :---- | :---- | ----- | ----- | ----- |
| US-1 | Ask & Answer | Shared Foundation | Chat | Both | v1 |
| US-2 | Two-Gate Confirmation | Shared Foundation | Chat | Both | v1 |
| US-3 | Governed Metric Availability | Shared Foundation | Chat \+ UI | Both | v1 |
| US-4 | Blank-Canvas Authoring | Dashboard creation | Chat \+ UI | FDE | v1 |
| US-5 | Global Filter Definition | Dashboard creation | UI | FDE | v1 |
| US-6 | Save & Publish Template | Dashboard creation | UI | FDE | v1 |
| US-7 | Mixed-grain / Custom FDE Dashboards | Dashboard creation | — | FDE | Later |
| US-8 | Template Instantiation | Dashboard edits | Chat \+ UI | Both | v1 |
| US-9 | Add Widget to Dashboard (placement) | Dashboard edits | UI | Both | v1 |
| US-10 | Remove / Rearrange Widgets | Dashboard edits | UI | Both | v1 |
| US-11 | Clone Canonical → Personal | Dashboard edits | Chat \+ UI | Both | v1 |
| US-12 | Create New Dashboard from Widget | Dashboard edits | UI | End user | v1 |
| US-13 | Widget Create | Widget Operations | Chat \+ UI | Both | v1 |
| US-14 | Widget Edit (metric / dimension) | Widget Operations | Chat \+ UI | Both | v1 |
| US-15 | Viz Toggle | Widget Operations | Chat \+ UI | Both | v1 |
| US-16 | Widget Filters (dimension \+ topical) | Widget Operations | Chat \+ UI | Both | v1 (dimension) / v2 (topical) |
| US-17 | Add-to-Dashboard Picker (grain enforcement) | Widget Operations | UI | Both | v1 |
| US-18 | Advanced (eligibility-gated) Visualizations | Widget Operations | Chat \+ UI | Both | v2/v3 |
| US-19 | Delete Widget | Widget Operations | Chat \+ UI | Both | v2+ |

### **5.1 Shared Foundation**

Capability-independent contracts. Single source of truth for the behaviors the other categories build on.

**US-1 · Ask & Answer — v1 · Chat**

*As a user, I want to ask a question in plain English and get a structured answer with an appropriate visualization, so I can get insight without building anything.*

Any chat request first resolves to an answer with an appropriate visualization. Whether that answer is then persisted (and how) is what distinguishes the other categories. Read-only Q\&A is always available to both personas and is the substrate for everything else.

**Acceptance criteria**

* Given a question naming in-catalog metrics/dimensions, a relevant widget renders with correct metric labels, dimension, date range, and comparison.

* Given a follow-up, session context is retained so the user can refine without repeating themselves.

* Given a question whose answer spans multiple views, the system may return **multiple widgets** from the single question (e.g., a trend plus a breakdown), rather than forcing one widget per turn.

* Given an out-of-catalog or derived-metric request, the system never returns a silent empty state — it renders an ephemeral answer where possible, explains the limitation plainly, suggests an in-catalog alternative, and (for derived metrics) surfaces the FDE-request path. *(INV-8; Appendix A; Appendix D.)*

* Given a request the system partially understands, it renders what it can and states what it assumed or dropped.

**Requirements**

* The acceptable functionalities reachable from a chat answer (create, edit, filter, toggle viz) are defined in **Appendix C**.

* Supported question patterns and worked examples are in **Appendix A**.

**US-2 · Two-Gate Confirmation — v1 · Chat**

*As a user, I want a clear separation between seeing a preview and saving it, so nothing lands on my dashboard without my say-so.*

**Gate 1 — Render (auto vs. clarify).**

* Clear query → preview auto-renders immediately.

* Ambiguous query → a clarify step first: the system shows its proposed interpretation (metrics, dimensions, scope); it renders only after the user confirms or adjusts. *(Triggers in Appendix D.)*

* Missing-but-defaultable parameter (e.g., no date range) → apply a sensible default and **state it inline** ("Showing last 4 weeks — change if needed") rather than blocking.

* Never a silent empty state.

**Gate 2 — Persist (explicit).** A rendered preview is not saved until an explicit action:

* **Widget → dashboard:** chat previews the widget; **placement happens in the UI** via the add-to-dashboard picker (US-17), which lists only grain-eligible dashboards plus "create new."

* **Widget edit:** the user taps **Apply/Save** (chat or UI); changes persist to their own or cloned dashboard.

* **Authoring (FDE):** the user saves the canvas as a dashboard or template.

* Only widgets that satisfy the governance rule (INV-8) can be persisted; ungoverned results stay ephemeral.

**US-3 · Governed Metric Availability — v1 · Chat \+ UI**

*As a user, I want to pick from a sensible, valid set of metrics and dimensions, so I'm not overwhelmed by \~50 options or able to build an invalid combination.*

What a user may pick for a widget is governed by three stacked layers.

1\. **Correctness layer (always on) — the compatibility matrix.** The semantic layer's metric–dimension compatibility matrix determines which combinations are valid for a source. Invalid combinations are never offered or produced. Cannot be overridden.

2\. **Usability layer (default) — system-suggested subset.** The system surfaces a suggested/"featured" subset of metrics per source by default, so the user sees a sensible shortlist rather than all \~50. The full valid set remains reachable via "show all."

3\. **Governance layer (optional) — FDE curation.** An FDE may override the featured subset per source (add/remove/reorder). If curated, that subset replaces the system-suggested default for the account.

**Acceptance criteria**

* Given any widget create/edit, only matrix-valid metric+dimension combinations are ever offered or rendered.

* Given no FDE curation, the system-suggested subset is shown by default with "show all" available.

* Given FDE curation exists for the source, the curated subset is shown by default instead.

* Given a user explicitly names a valid-but-non-featured metric, it is honored (featuring governs default surfacing, not hard permission).

**Requirements**

* **Governed persistence (INV-8):** a widget is saveable/editable only if all its metrics/dimensions are registered. Derived or unregistered metrics → ephemeral chat answer \+ disclaimer \+ FDE-request path; no save, no edit.

### **5.2 Dashboard creation (FDE only)**

Building a dashboard or template from blank. **FDE only**, because authoring requires resolving grain and defining the global filter set — decisions end users should never face. This is also how the templates that end users instantiate come to exist.

**US-4 · Blank-Canvas Authoring — v1 · Chat \+ UI · FDE**

*As an FDE, I want to describe a dashboard and iteratively build it on a canvas, so I can stand up a governed template without hand-configuring every widget.*

**Acceptance criteria**

* Given the FDE opens the authoring canvas and describes a dashboard, one or more widget previews render on a persistent canvas.

* Given successive requests, canvas state accumulates across turns (add, edit, reorder, remove) within the session.

* Given the FDE adds widgets, the canvas enforces **single-grain** composition: the first widget establishes the dashboard grain; subsequent widgets must be grain-compatible (INV-7). Incompatible additions are surfaced, with the option to start a separate dashboard.

* Given the canvas has ≥1 widget, the FDE can save it as a **dashboard** or as a **template**.

* Given the FDE does not save, nothing persists.

**Edge cases**

* Empty canvas save → blocked with explanation.

* A widget whose source has no conformed-dim overlap with the established grain → flagged at add time, not at save.

* Session interruption/refresh → canvas state recoverable via draft autosave. *(Open Q: retention window.)*

**US-5 · Global Filter Definition — v1 · UI · FDE**

*As an FDE, I want to define a dashboard's global filter set, so end users get coherent shared controls without an overwhelming or meaningless filter bar.*

**Acceptance criteria**

* Given a dashboard under authoring, the system offers only **conformed dimensions valid across every widget's source** as global-set candidates (INV-2). Source-specific dims are not eligible for global.

* Given the FDE selects the global set, those filters apply across the dashboard's widgets.

* Given a widget is added later that lacks one of the global dims, the system warns the FDE that the global set will no longer be universally applicable and offers to narrow the set.

* Given an end user later opens the dashboard, they can use the global filters but cannot redefine the set.

**Edge cases**

* Single-widget dashboard → global set defaults to that widget's conformed dims; FDE-confirmable.

* No conformed dims across widgets (should not occur under INV-7) → global bar shows Date-only or none, with a note; this is the degenerate case INV-7 exists to prevent.

**US-6 · Save & Publish Template — v1 · UI · FDE**

*As an FDE, I want to save an authored dashboard as a reusable template and publish it to the right clients, so onboarding a client/brand doesn't start from scratch.*

**Acceptance criteria**

* Given an authored dashboard, the FDE can save it as a **template**: single-grain, with its global set and eligible-metric curation baked in.

* Given a template exists, end users in the target account(s) can instantiate it; the instance is fully editable.

* Given publishing, the FDE can target **one client, several clients, or all clients** — for both **templates** and **dashboards**.

* **v2:** template versioning and propagation of updates to existing instances. *(v1 instances are independent copies.)*

**US-7 · Mixed-grain / Custom FDE Dashboards — later · out of scope here**

Bespoke dashboards mixing grains, with custom UI or fixed layouts, are acknowledged but not specified here. FDE-owned, code-adjacent, handled separately. Flagged so reviewers know the omission is deliberate.

### **5.3 Dashboard edits (both personas)**

Changing an existing dashboard's composition. End users operate only on templates they've instantiated or dashboards they've cloned/own.

**US-8 · Template Instantiation — v1 · Chat \+ UI · Both**

*As an end user, I want to instantiate an FDE template into my own dashboard, so I get a governed starting point I can personalize.*

**Acceptance criteria**

* Given available templates, the user can instantiate one into their Personal space as an independent, editable copy.

* Given instantiation, the template's grain, global filter set, and eligible-metric curation carry into the instance.

* Given the user edits the instance, changes never affect the source template or other users' instances.

**Edge cases**

* Template updated after instantiation → instance unaffected in v1 (independent copy); propagation is v2.

* Same template instantiated twice → two independent instances; names disambiguated.

**US-9 · Add Widget to Dashboard (placement) — v1 · UI · Both**

*As a user, I want to place a widget onto a dashboard, so I can extend a view.*

**Acceptance criteria**

* Given a widget previewed in chat, **placement is performed in the UI** via the add-to-dashboard picker (US-17), which lists only grain-eligible dashboards plus "create new."

* Given the widget is placed, it responds to the dashboard's global filters and appears in the layout.

* Given the target is a canonical dashboard, placement routes to the user's clone (INV-6).

**US-10 · Remove / Rearrange Widgets — v1 · UI · Both**

*As a user, I want to remove or rearrange widgets on my dashboard, so it reflects what I care about.*

**Acceptance criteria**

* Given a dashboard the user owns/cloned, they can remove a widget (with confirm) and rearrange layout **via the UI**; changes persist on Save. *(This is a UI operation, not a chat operation.)*

* Given removal leaves the global set referencing a dim no longer present on any widget, the global bar updates gracefully (drops the unused control) with a note.

* Given a canonical dashboard, edits route to the clone.

**US-11 · Clone Canonical → Personal — v1 · Chat \+ UI · Both**

*As a user, I want to clone a canonical/standard dashboard into my space, so I can customize without affecting the shared version.*

**Acceptance criteria**

* Given a canonical dashboard, the user can clone it to Personal; the clone is fully editable.

* Given any edit attempt on a canonical dashboard, the system auto-creates/uses the clone and applies changes there (INV-6).

**US-12 · Create New Dashboard from Widget (end-user path) — v1 · UI · End user**

*As an end user, when no existing dashboard fits my new widget's grain, I want to create a new dashboard for it, so I'm never blocked.*

**Acceptance criteria**

* Given the add-to-dashboard picker, "create new" produces a new single-grain dashboard seeded by the widget's grain.

* Given the new dashboard, its global filter set defaults to the widget's conformed dims (end users don't hand-define global sets; the system seeds a sensible default per INV-2).

* Given the user later adds widgets, the grain-eligibility rules apply as everywhere.

### **5.4 Widget Operations (both personas)**

Creating, editing, and filtering individual widgets. Available to both personas, via **chat and UI**, everywhere chat is present.

**US-13 · Widget Create — v1 · Chat \+ UI · Both**

*As a user, I want to describe a widget and have it rendered, so I can get exactly the view I need.*

**Acceptance criteria**

* Given an in-catalog request, a widget preview renders per the intent→viz mapping (Appendix B) and the availability layers (US-3).

* Given a created widget, it is **editable via both chat and the UI** — metrics/dimensions, filters, and visualization (Appendix C).

* Given the widget is placed inline on a dashboard, its source grain is checked at **placement** (US-17), not creation.

* Given the widget uses a derived/unregistered metric, it renders as an ephemeral answer only — not saveable or editable — with a disclaimer and FDE-request path (INV-8).

* Given an out-of-catalog or ambiguous request, US-1/US-2 behaviors apply.

**US-14 · Widget Edit (metric / dimension) — v1 · Chat \+ UI · Both**

*As a user, I want to change or add a metric/dimension on a widget, via chat or the UI, so I can adjust it however I prefer.*

**Acceptance criteria**

* Given a selected widget and a matrix-valid metric/dimension for its source, a preview renders; on Apply the widget updates (chat or UI).

* Given an edit requiring a second source, it is refused with a plain explanation (INV-5).

* Given an edit changes the widget's intent (e.g., adds a dimension split), the visualization updates to the valid default for the new intent (Appendix B).

* Given a widget built on a derived/unregistered metric, editing is disabled with a disclaimer (INV-8).

* Given an added metric is valid-but-non-featured, it is honored when named explicitly (US-3).

**US-15 · Viz Toggle — v1 · Chat \+ UI · Both**

*As a user, I want to switch a widget's chart type within what its data supports, so I can see it in the most useful shape.*

**Acceptance criteria**

* Given a viz type the widget's config can correctly feed, the widget re-renders in it on Apply.

* Given a viz type the config can't feed (e.g., scatter with one metric), the system declines, explains what's missing, and offers the currently-eligible viz types (INV-4, Appendix B).

* The eligible set is drawn from the platform's supported chart library (Vega-based), not a fixed three (Appendix B).

**US-16 · Widget Filters (dimension \+ topical) — v1 (dimension) / v2 (topical) · Chat \+ UI · Both**

*As a user, I want to filter a widget or dashboard — by dimension and by compound numeric condition — so I can scope what I see and find problem SKUs.*

**Acceptance criteria — dimension filters (v1)**

* Given a conformed-dimension filter (Brand, Category, Date), it applies at dashboard level with per-widget override (INV-1).

* Given a source-specific-dimension filter (e.g., keyword, ad type), it applies at the selected widget level only.

* **Widget-level filters are a first-class capability** (a deliberate differentiator vs. tools that only offer global filters).

**Acceptance criteria — topical / threshold filters (v2)**

* Given "SKUs with ad-spend \> 100 and RoAS \< 2" with clear bounds, a Breakdown widget of matching rows renders.

* Given a topical request missing a bound ("high ad-spend but low RoAS"), the system asks for the threshold before rendering (Appendix D, D4).

* **v2** — gated on parse reliability.

**US-17 · Add-to-Dashboard Picker (grain enforcement) — v1 · UI · Both**

*As a user, when I place a widget on a dashboard, I want only compatible dashboards offered, so I never create an incoherent dashboard.*

**Acceptance criteria**

* Given a widget to place, the **UI** picker lists **only grain-eligible dashboards** (those whose grain matches the widget's source, so global filters stay coherent — INV-7), plus a **"create new"** option.

* Given no eligible dashboard exists, the user creates a new one seeded by the widget's grain (US-12).

* Given the user picks an eligible dashboard, the widget is added and responds to global filters.

* **Rationale:** grain compatibility is enforced by *not offering* incompatible targets, rather than rejecting after the fact. Chat previews the widget; the UI handles placement with grain enforcement.

**Edge cases**

* Widget grain matches multiple dashboards → all listed; user chooses.

* Canonical dashboard is grain-eligible → offered, but placement routes to the clone (INV-6).

**US-18 · Advanced (eligibility-gated) Visualizations — v2/v3 · Chat \+ UI · Both**

*As a user, I want richer chart types (e.g., scatter, geo, heatmap) when my data supports them, so I can see relationships the default viz can't show.*

**Acceptance criteria**

* Given a widget config that satisfies an advanced viz's input requirements (e.g., two metrics for a scatter, a geographic dimension for a mapview), that viz becomes available to toggle (INV-4, Appendix B).

* Given the config doesn't satisfy it, the viz is not offered.

* Given a chart type absent from the platform's supported (Vega-based) library, it routes to FDE.

**US-19 · Delete Widget — v2+ · Chat \+ UI · Both (deferred)**

*As a user, I want to delete a widget.*

**Acceptance criteria (when shipped):** explicit confirmation; own/cloned dashboards only; canonical never deletable via chat.

## **6\. Success Metrics**

**Leading (0–30 days):**

* Adoption: ≥ 50% of active dashboard users invoke chat creation/edit within 30 days.

* Apply/place rate: ≥ 40% of chat-created widget previews are placed on a dashboard; ≥ 40% of inline edit previews are applied.

* Template instantiation: ≥ 30% of active accounts instantiate ≥1 template in 30 days.

* Auto-render rate: ≥ 60% of queries render without a clarify step.

* First-attempt success: ≥ 75% of chat requests return a valid populated widget on first attempt.

* Thumbs-down rate: \< 10% on chat-produced widgets.

* Grain-safety: 0 end-user-created dashboards with a collapsed/incoherent global filter set (INV-7 working as intended).

**Lagging (30–90 days):**

* Engineering deflection: measurable drop in in-catalog view creation/customization requests routed to engineering (Problem 1).

* Self-serve creation: increase in chat-origin dashboards per active account.

* Engagement/retention: chat-creation users show higher weekly dashboard engagement than non-users.

## **7\. Open Questions**

| \# | Question | Owner | Blocking? |
| ----- | :---- | ----- | ----- |
| Q1 | Authoritative interface to the registered metric universe the system validates against, and its refresh guarantees | Data / Eng | No |
| Q2 | NLQ readiness — which capabilities are reliable enough per version; does launch gate on eval thresholds? | AI/ML  | Gates v2/v3 |
| Q3 | Draft retention window for interrupted authoring sessions (US-4) | PM / Eng | No |
| Q4 | Does the eligible-metric featured subset (US-3) live in the semantic layer or a separate config store? | Data / Eng | No |
| Q5 | Persona gating — is the end-user vs. FDE ceiling per-account or per-user-role? | PM / Eng | No |
| Q6 | Ambiguity threshold for the clarify step — engineering owns final logic; Appendix D lists example triggers | Eng | No |
| Q7 | Template update propagation model for v2 (US-6) — how instances opt into updates | PM | No (v2) |
| Q8 | Does grain-eligibility (US-17) key off source identity, or a formal grain attribute in the semantic layer? | Data / Eng | Yes — blocks US-17 |

## **8\. Timeline & Dependencies**

**Version mapping:**

* **v1 (foundational):** Ask & Answer, Two-Gate Confirmation, three-layer metric availability, Widget Create/Edit/Viz-toggle/dimension-Filters, Add-to-Dashboard picker \+ grain enforcement, Dashboard edits (instantiate, add/remove/rearrange, clone, create-new), basic Dashboard creation (blank-canvas, global-filter definition, save & publish template, metric curation). Dimension filters only.

* **v2:** Topical/threshold filters, advanced eligibility-gated viz (scatter/geo/heatmap class), template versioning & propagation, delete.

* **v3:** Further advanced viz, mixed-grain/custom FDE dashboards (or separate PRD), maturity of reuse/defaults.

**Dependencies:**

| Dependency | Owner | Impact |
| :---- | :---- | :---- |
| Registered metric universe / semantic query interface | Platform / Data | Field validation; blocks all versions |
| Metric–dimension compatibility matrix in semantic layer | Platform / Data | Correctness layer (US-3); blocks widget ops |
| Formal grain attribute / source-grain model | Platform / Data | Blocks US-17 grain-eligibility (Q8) |
| Supported (Vega-based) chart library | Platform / Eng | Blocks viz eligibility (US-15, US-18) |
| NLQ parse capability \+ readiness signal | AI/ML (Rajan) | Gates v2/v3 |
| User-level state persistence (Business Overview) | Platform | Reused for save/apply/clone; low risk |
| Authoring canvas surface (prototype exists) | Design / Eng | Blocks §5.2 |

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **Appendix A — Supported Utterance Types & Examples**

Chat accepts two families of input:

* **Analytical questions** (interrogative → the system returns an *answer*, which may become a widget): the four analytical intents below — Descriptive, Diagnostic, Prescriptive, Predictive.

* **Action commands** (imperative → the system performs an *operation*: create, edit, filter, assemble): a distinct intent class, mapped to the relevant user stories.

A single utterance may produce **multiple widgets** (e.g., a trend plus a driver breakdown). Examples are representative, drawn from the Omni question set; they are in addition to the pattern taxonomy below.

### **Intent classes**

| Intent class | What it does | What it answers / performs | Typical output |
| :---- | :---- | :---- | :---- |
| Descriptive | Analytical | "What happened?" — state, level, trend, mix | Scorecard / trend / breakdown |
| Diagnostic | Analytical | "Why did it happen?" — drivers, attribution, root cause | Breakdown \+ narrative (L0–L3 lens); often multi-widget |
| Prescriptive | Analytical | "What should I do?" — recommendations, prioritization | Ranked list / recommended-action cards |
| Predictive | Analytical | "What will happen?" — projection, sufficiency vs. future demand | Trend \+ projection |
| **Action** | Imperative | "Do this" — create / edit / filter / assemble | The operation (widget or dashboard change); see US-4, US-13, US-14, US-16 |

Refer this doc for sample questions and expected responses

[Chat\_Dashboarding\_Golden\_Set\_v1](https://docs.google.com/spreadsheets/d/1DEbcKfQKx8VEtxM0BG9i5CVtvTxK9UswBHKhXQ6tMys/edit?usp=sharing)

### **Example utterances — analytical questions & commands**

Questions and commands intermixed, as in real usage. Expected output shown per row.

| \# | Example utterance | Pattern | Expected output |
| ----- | :---- | :---- | :---- |
| 1 | How is my total business performing this week vs. last year across all channels? | Descriptive | Scorecard: Total POS this week vs. LY, with % delta |
| 2 | What is the contribution of Digital vs. In-store to my total revenue growth this month? | Descriptive | Breakdown of growth by channel |
| 3 | How is my sales performance this month trending week over week? | Descriptive | Weekly trend line |
| 4 | Create a widget with traffic KPIs | **Action — create widget** | Widget preview with traffic KPI set → Apply |
| 5 | What percentage of total revenue growth came from new product launches? | Descriptive | Contribution breakdown; NPD share of growth |
| 6 | Identify 20 SKUs losing the most impressions vs. the previous period | Descriptive | Ranked table, top-20 by impression loss |
| 7 | Add net sales and average selling price to this widget | **Action — edit widget** | Edited widget preview (2 metrics added) → Apply |
| 8 | Which SKUs have seen the biggest change in ASP this period? | Descriptive | Ranked table by ASP change |
| 9 | Show me the top 20 products with the highest average selling price | Descriptive | Ranked table, top-20 by ASP |
| 10 | Add a filter for the Kitchen category to this widget | **Action — filter** | Widget re-scoped to Kitchen → Apply |
| 11 | How much of my total brand sales is driven by advertising? | Descriptive | Scorecard / share of ad-driven sales |
| 12 | For brand Shark, what were the primary drivers of change (Units, ASP, or Conv)? | Diagnostic | Driver decomposition; often multi-widget |
| 13 | Is revenue growth driven more by unit volume or an increase in ASP? | Diagnostic | Units vs. ASP attribution |
| 14 | Create a dashboard with 3 widgets: revenue trend, top-10 SKUs, and channel mix | **Action — create dashboard** | Canvas with 3 widget previews → Save (FDE authoring) |
| 15 | Did declining ad spend affect the drop in organic units? | Diagnostic | Correlated trend of ad spend vs. organic units |
| 16 | What is driving cuts in my Purchase Orders this week? | Diagnostic | PO cut drivers breakdown |
| 17 | Which SKUs are currently OOS and what is the root cause? | Diagnostic | OOS SKU list \+ RCA narrative |
| 18 | Change this chart to a bar chart | **Action — viz toggle** | Widget re-rendered as bar (if eligible) → Apply |
| 19 | Were my recent promotions successful in driving incremental volume? | Diagnostic | Promo lift vs. baseline |
| 20 | Are my highest-revenue products also my most profitable ones? | Diagnostic | Revenue vs. profit comparison (scatter if eligible) |
| 21 | What are the three things I need to focus on today to hit my sales goal? | Prescriptive | Ranked recommended-action cards |
| 22 | On which SKUs should I increase my spend to maximize ROI next week? | Prescriptive | Ranked SKU list by projected ROI |
| 23 | Where should I expedite shipments to avoid future stockouts? | Prescriptive | Ranked list of at-risk SKUs/locations |
| 24 | Which SKUs are best suited for an upcoming promotion? | Prescriptive | Ranked SKU candidates |
| 25 | What is the maximum discount I can offer without arbitrage risk? | Prescriptive | Threshold recommendation |
| 26 | Which SKUs fall into low incrementality bands and should have budget reallocated? | Prescriptive | Ranked SKUs by incrementality band |
| 27 | Are safety stock levels sufficient for Prime Day demand? | Predictive | Coverage projection vs. forecast demand |

### **Command utterances — by action**

Imperative commands map to the operation they trigger. Same behavior as any chat operation: preview → Apply (Gate 2), clarify if ambiguous.

| \# | Command | Action type | Expected output |
| ----- | :---- | ----- | :---- |
| C1 | "Create a widget with traffic KPIs" | Create widget | Widget preview from traffic KPI set → Apply (US-13) |
| C2 | "Create a dashboard with 3 widgets: revenue trend, top-10 SKUs, channel mix" | Create dashboard | Canvas with 3 widget previews → Save (US-4, FDE) |
| C3 | "Add net sales and average selling price to this widget" | Edit widget | Edited widget preview, 2 metrics added → Apply (US-14) |
| C4 | "Break this down by SKU instead of brand" | Edit widget | Widget re-rendered with new dimension → Apply (US-14) |
| C5 | "Add a filter for the Kitchen category" | Filter | Widget/dashboard re-scoped → Apply (US-16) |
| C6 | "Filter to SKUs with ad-spend \> 100 and RoAS \< 2" | Filter (topical, v2) | Breakdown of matching rows → Apply (US-16) |
| C7 | "Change this chart to a bar chart" | Viz toggle | Re-rendered viz if eligible; else eligible options offered (US-15) |
| C8 | "Rename this widget to 'Q4 Revenue Pacing'" | Edit widget | Widget title updated → Apply (US-14) |

Notes: commands that would create or edit a widget on a derived/unregistered metric render as ephemeral answers only and cannot be saved (INV-8). Placement of a created widget onto a dashboard is completed in the UI via the grain-eligible picker (US-17).

## **Appendix B — Supported Visualizations**

Viz is auto-selected on creation and toggleable within the **eligibility-gated** valid set (INV-4). The supported set is **not restricted to a fixed three** — it is whatever the platform's chart library (Vega-based) supports, offered whenever the widget's config can feed it.

| Intent | Defined by | Default viz | Eligible viz (examples) |
| :---- | :---- | ----- | :---- |
| **Scorecard** | No time axis, no dimension split | KPI card (value \+ delta) | KPI card variants |
| **Trend** | Time axis present | Line | Line, area, bar; **dimensional-breakdown line chart**; **two metrics on one line chart with dual axes** (when units differ); small-multiples where pattern-eligible |
| **Breakdown** | Dimension split present | Bar or table | Bar, stacked bar, table/grid, **mapview/geo, pie, heatmap, boxplot**, and other Vega-supported types the config can feed |

Notes: "Compare" is a Breakdown; "Table" is Breakdown's grid shape; multi-metric applies to any intent. Small multiples is a shape variant under Trend.

**Advanced (eligibility-gated) visualizations (v2/v3).** Richer viz types become available when the widget's config supports them — e.g., a two-axis viz unlocks with two metrics; a mapview unlocks with a geographic dimension; a boxplot unlocks with a distribution. The principle is *any viz the data can correctly feed*, drawn from the supported library — not free-form choice. Chart types absent from the library remain an FDE capability.

## **Appendix C — Supported Functionality (Chat & UI)**

What is possible through each surface. Chat and UI are parallel surfaces for widget operations; some operations are UI-only where direct manipulation is clearer.

| Function | Chat | UI | Constraint |
| :---- | ----- | ----- | ----- |
| Ask & answer (read-only) | ✅ | — | — |
| Create widget | ✅ | ✅ | Matrix-valid; governed metrics only (INV-8) |
| Edit metric / add metric | ✅ | ✅ | Matrix-valid; source-scoped; featured governs default surfacing |
| Edit / add dimension | ✅ | ✅ | Matrix compatibility; single source (INV-5) |
| Apply / change dimension filter | ✅ | ✅ | Conformed → dashboard w/ override; source-specific → widget |
| Apply topical / threshold filter | ✅ (v2) | ✅ (v2) | Both bounds required |
| Toggle visualization | ✅ | ✅ | Eligibility-gated to what the config can feed (INV-4) |
| Rename widget | ✅ | ✅ | — |
| Change date range / comparison | ✅ | ✅ | Default applied \+ stated if omitted |
| Place widget on a dashboard | — | ✅ | UI-only; grain-eligible picker (US-17) |
| Remove / rearrange widgets | — | ✅ | UI-only |
| Instantiate template | ✅ | ✅ | — |
| Clone canonical → personal | ✅ | ✅ | Canonical never mutated (INV-6) |
| Author dashboard from blank | ✅ | ✅ | FDE only |
| Define global filter set | — | ✅ | FDE only; conformed dims only (INV-2) |
| Curate eligible-metric subset | — | ✅ | FDE only |
| Publish template/dashboard to clients | — | ✅ | FDE only; one / many / all clients |
| **Create a new metric** | ❌ | ❌ | FDE-via-code only |
| **Bind / change data source** | ❌ | ❌ | FDE-via-code only |
| **Save a derived/ungoverned-metric widget** | ❌ | ❌ | Ephemeral only; FDE-request path (INV-8) |
| **Fuse two sources in one widget** | ❌ | ❌ | INV-5 |
| **Delete widget / dashboard** | ⏳ | ⏳ | Deferred v2+; own/cloned only, explicit confirm |

## **Appendix D — When-to-Clarify Decision Logic**

Example triggers; engineering owns the final confidence logic and threshold (Q6). The behavioral contract is fixed; firing conditions are tunable in build.

**Route to a clarify step when:**

* **D1 · Ambiguous metric** — matches multiple catalog metrics with no disambiguator.

* **D2 · Vague intent** — no resolvable metric ("show performance"): propose a metric set.

* **D3 · Unspecified dimension for a breakdown** — breakdown implied, split dimension unclear.

* **D4 · Topical threshold missing a bound** — "high ad-spend but low RoAS" without numbers.

* **D5 · Ambiguous scope** — "why did it drop" without a clear subject/entity.

* **D6 · Grain / metric-dim mismatch** — requested breakdown finer than the metric supports (e.g., SKU-level split on a metric only available at brand level): flag the unsupported grain instead of returning partial results.

* **D7 · Ambiguous entity reference** — a proper noun matches multiple catalog entities ("Bose" as a brand vs. a category vs. a campaign name): disambiguate which is meant.

**Do NOT clarify — assume and surface instead — when:**

* **D8 · Missing but defaultable date range** → apply a sensible default and state it inline.

* **D9 · Missing comparison period** → default to vs. prior period and state it.

**Never:**

* Return a silent empty state. If nothing can be produced, explain plainly and suggest a rewording or in-catalog alternative (Appendix A9).

## **Appendix E — Widget & Dashboard Invariants**

Structural guarantees that hold for every chat- or UI-produced widget and dashboard, all categories, both personas.

* **INV-1 · Widget-level filter scope.** Every widget has a widget-level filter, defaulting to *inherit from global*, with a local override. Conformed dims filter at dashboard level with per-widget override; source-specific dims filter at widget level only.

* **INV-2 · Global filter set \= conformed dims.** A dashboard's global filters may only be conformed dimensions valid across every widget's source. FDE-authored dashboards: the FDE defines the set explicitly (US-5). End-user-created dashboards (from a widget, US-12): the system seeds the set from the widget's conformed dims. In both cases the global set is guaranteed meaningful to every widget.

* **INV-3 · Chat/UI-created widgets are first-class.** Same affordances as any other widget: edit/toggle metric, edit/toggle dimension, apply filters, toggle viz within the eligible set — via chat and UI. All options are source-scoped and governed by US-3.

* **INV-4 · Governed, eligibility-gated viz — not fixed, not free-form.** A sensible viz is auto-selected on creation; the toggle set expands as the config unlocks more viz types, drawn from the platform's supported (Vega-based) library. A viz is offered iff the data can correctly feed it. Chart types absent from the library remain an FDE capability.

* **INV-5 · One source per widget.** No operation may fuse two sources into a single widget.

* **INV-6 · Canonical protection.** Canonical/standard dashboards are never mutated; any edit routes to the user's clone.

* **INV-7 · Single-grain dashboards (end-user path).** A dashboard end users can create/extend is single-grain: all widgets share the conformed dims that back the global filter set. Enforced at placement (US-17) by offering only grain-eligible dashboards. Mixed-grain dashboards are an FDE-only, later capability.

* **INV-8 · Only governed widgets persist.** A widget persists — is pinnable, dashboard-addable, and editable — only if all its metrics are registered and it has a renderable eligible visualization. Ungoverned results render as ephemeral chat answers only and route to the appropriate FDE-request path; they are never saved as locked or static widgets.

*End of document*

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcwAAAEkCAYAAACizAFpAAAz1UlEQVR4Xu2d65dU1ZnG5y+Zj1lrWPkwfNGsyWJ0yUzI4DAhhBAMGYIGNBIQxAtKQEJ3ABVRRO5gBJFrhACC0AgignINEmVAIIgihMhFuYU77Oln4z7s2nW6+nR3VZ1TVb/fWs+qOvtcqrr6nP2c992X808GAAAAmuWfwgIAAADIB8MEAABIAIYJAACQAAwTAAAgARgmAABAAjBMAACABGCYAAAACcAwAQAAEoBhAgAAJADDBAAASACGCQAAkAAMEwAAIAEYJgAAQAIwTAAAgARgmAAAAAnAMAGgWdq3b29OnjwZFgPUFBgmADTLP//zP5uVK1eGxQA1BYYJADmcP38+LLKG+dRTT4XFreLQoUOmQ4cOYXFZuXbtmunWrZu5ePFiuAqgSTBMADD79u0zL730knn44YdNp06dzOXLl3PWyzAfeOCBnLLWsmXLFnu8zz77LFxVNq5evWq/w6JFi8JVAE2CYWYMXcTVQENDgxk2bFhYDBnj+vXrpn///va889W5c2dz48aNaDuVKSIrBs4w169fH64qG84wx4wZE66yuN9h8+bN4SqoYTDMGG7evBkWlY0khqk00sCBA21ll1XuvvvuRH8LpMvYsWPt/6ljx442VapIs127drZs7dq10XbORIuBM8yHHnrITJ482fTp08f069fP7NmzJ9y0ZDjD1N/96quv2ui5b9++Zvny5Xa9M0z9FmnWB5AtMMwAmZG7WHQxff311+EmJUWf21xvxDfffNNul+X2F/cbQraJ+z/t3bvXlg0ePDgq07JStW2hd+/e0ef5UvmECRNKcj7PmzfPTJ061Vy5csUuT58+Pe/zpa5du5rRo0ebY8eOBUfI5/Tp07HtvE0RGq6WZczuxiTufwDZBMOMQR0S/BNZFUd40pcKfd4nn3wSFufw2muvZf4CoxLIPidOnLD/o5EjR+aU61xXuUzMoWXdQCZhw4YNZubMmeb111/PSbsqpetfV4899pj561//6u2ZHBmOotOFCxeaXbt2havNpUuXzDPPPBN9lsz++PHj5sUXX8z5DoqaP/roo3D3WL788kszYsSIaF+9X7duXbiZ2b9/v3396quvbN3RvXv3nJuBnj175nwHSeYJ2QfDLIDGnoUnd3PRX1vRZyhlVQi1DWq7LON+L8guMrSkKUf9L3U9qF3z5Zdfjv6/Fy5ciLbZtm1bFDXdeeedkbkoI+KjHqoqnzNnTk55UtxnywRlSHp/8ODBaL2fJVJbutoh487HHj162FRwHDI738TGjRsXHUMpXN0IuBtrfQ+ZqVBGSmWbNm2Ktne/h8OVHTlyJCqDygDDLIBO6g8//NCmYFxFoEqjlG0t7mIrhNpawos/a8RVUJAtpkyZkjiy0f9S2w4fPjzHCPxOM+4a0XhNta+rp62W49o+VT5x4sSwuFlkgNp39+7ddnnHjh1530M3AirzOympTV0Rp4/aTnVDHMfhw4ftMdwNgaJhLftRtoxfvWxVrihSnDp1yi67G+0uXbpEv5XDT8Uq4oXKAcMsgE7osCefDFPlzUWBTTFjxgzTq1ev6ILx7zxF3GeGaB//AmyOlra5hCjFNnv2bPt+6dKlNnJYsWJFTi/KkLCSSIIigyQRvCozddqIQ+m5MKUO8ThD0zndHP7vqchMPPfcc9Hv66I6P2p0Hb+kadOmReVCpuGbnAzQdbhpiq1bt9pj+Tes/vdyqVn9PTLD5hgwYECOmcvsdG6LcNiJi5bj8M8z9x0ll5p1phniomOnc+fOhZtAxsAwC6CTWHe0Pp9//rm9ICVdYCGF2lZ0AfkXiKQODz4qW7NmTU5ZiH+BFiJpm4toqt1J1NfX2ztmP9Ul+V3u9X7+/PmRMSf9jkLH9dN8qkh0rBDd7auS1TaqcF0azOHWhYKmcb+Ror2489nhttN57zrCbd++Pfp9Dxw4YN+72YDCc13m6aPlxx9/PFrW+M8hQ4Z4W+SjDjw6ltoihYs2nRT9CmfUq1ev9nfPQxGnf7Mgs/eXdY65jk+atMH/bIeuG5W7DlH6+933cbi21Dj830k3ws5kIZtgmAXQSRxXcYvwolC7hiuLa1txbRtSobtfXaTurta/Q1dHH4crC+UPwk7a5iKaa3dS6s4da9KkSTkdGNRBKfweThrf1xwbN26Mtn/22WetoSu9pWV9rw8++CDa1m2n76goxy2H6/19oHlCc/PlCJf9cv+9L92A+eU+MkiVjR8/PsraFDJsobbWsOPQzp077Tr/M1zkHCf/enap20GDBtlIU+91PjrUvqnhW8K1u8ZJGQ+HrjOVqUOVQx2bVObSyG4/Nfe4TIl/MwrZBcMsgE7eV155JSy2hCe3Wy7UtqI7WLfd4sWL7UUYospjwYIF0R27L0dY7mvWrFl2m6RtLup4oOVC7U76ruF3cLj0sCpA3X1rLJ9rY00yDMENkQmP7X4/18am9G/4vdx+LpWlv9WVuYoOkqEbO43JdOaljmVKvztUFtdLVtu7IRvPP/989Pv7U9+57IGPsihu27j/f1O4nr2SSw0L3YT6x1Dk98QTT0Tb6jyS2frXnM7XQt9h1apVOe2sSkH76X59pj4nJG6yg7q6OpudEn4bpvtuTX0HyBYYZgHciRyOxXR3jO7kTtq24lBvQrdOhiNDcvgXpEvNhhdSuBxXnqTNJWm7k24CtKwIMCT8LqoYXFlTn++jSknbffzxx+GqnGO41JdfgaltVmWKUnw0HML/Dq6igmyh8Z5h+r/cyDSbawIpFbpZ1DWldK9uKtQzF7INhlkAl1ZV1CR0J+0PvnbtMknbVnxkABos7bZxUZJ/t+lwPe5c9/9wvcMvT9LmkrTdyW2nAeAhKvd7Wrp9k3ZMWrZsmd3u7bffzilXytg/tqJud2wXJbgeiXGTgrt1TnF3/QAALQHDjEFRXpgm8SXT9MeuuYHevuLaVlw7p4zY9TBVxe6iOt1h6lWf7beBnDlzxpbJNITaTFzqzJfKXKeBpG0uflunFNfupEmy9T7soCTCY0tqBzp69Kh9n2Q+2XB/J99EFVnKhMNhDZJrU3XLSiW6GxD/dwAAaAsYZoDMKayQJbWdqfIPIzaHa7eTmmpbCQczh6Ys81QXdA3ZCJHZ+jOvfPHFF3nfMew0kaTNxXWfl5pqd3KmEzdRteu84aQ0m0Op3qFDh3pbx/PGG29EnS4kvQ8Hu+tvdxGv+910gyDDd4QdQsKbCgCAtoBhpoDaOjUdmTqmKM3Z1FAPuI0iTN1MJMF11lCnjxdeeCFnFhgAgNaCYUJFoEmz43ppAgCUCwwTKgL1NFZaVZNqAwCkAYYJFYEbM6detQAAaYBhQsVA5x0ASBMMEyoG9Y5NMlE4AEApwDABAAASgGECAAAkAMMEAABIAIYJAACQAAwTAAAgARgmFGTLli0578PlptZBdeD/X2+cO2tefPFFq6vHjlr97Gc/M5f3f2ql9/6yGwak7cbXjbLrtK87rnsPUClgmDWOX3HpvSo4VWxC5Vp2laa/zi27fV3l6CpXV3k6MNRs4v7/7v+o/5n+j5sb1uaY3sUd2626d/4vK7f8/BOP57wPl9977bXYZb13ZhqeS5gpZBUMs0rxzckf8J8V4/LN1I88oPi4Gx9ngqGRZVUuivUN3f09AGmAYVYhvkGKLBhkIVQB+pErFWLbcZGijEfmWAkG2ZxknkoL62+T+btlgHKBYVYo/l23XrNuiq3FTwtDPvpdZBrvL1mSkyqtFelGwE8Du6gUoBRgmBWEMw296i67VkzE/7sxz9uE7Ytou/09ZKCYJpQCDDPDhL0KIRcXfdYK+ltrMYpsrWSc7vcCKAYYZsao1SiyGFRb5yF3DijdGpoBSibXdqtXtXsCtAUMM2X8Ti56j0EWB5e+rTQDdVFzWPGj4sgZKOYJrQHDTBlVjv4QCygefmeoLN+IuBsltbv5HVhQ6URbJ7QGDLPMYJDp4UwzK1GnerdqXGQ1DPmoZLmeti7qzPLNFaQLhlkG/LQrpI9L16ZVMfpjJFE25GYpUnux632c1vkB2QXDLBGYZGXgJk0odeWo49N5pzLkpu3Te1HN45yhZWCYJaBclTAUn1J0FFKqj4iyMqV0rTsf9FrscwMqCwyzSNTamMBqxq8gW4s7H2ifrB7RxgkYZpEgoqw+2tLWqfQrZlld0iQI/k1xW26ooDLBMNtAtQ2Uh3xcj+Yk/2tFIJhk7YgUbe2BYbYSRR0MD6kdCqXcdS5oeEhYoaLqluscJDDO2gDDbCGl6BQClYWfolWajqgSyTy5ga5+MMwW0pr2LKguXNvm+4sX5VWcqHYl0xTcUFcvGGYzFErFQe0RTl/33uzZ5rnHH8urPFHtyk/VQnWBYTYDDfsg3EQUYeUos2SMJYqTO2+gesAwmyBJr0ioDTTnK+2UqLWi30P1gGHGQA9YcLR0OrufqhPQ7Nl55ah25eaohcoHw/TgThAcGlOpHrBh5YdQa0XbZuWDYXpgliCUgg0ru5ZKbZuKNsNyVNtSah8ql5o3TJkkDfPgYFwlKocUbXKDXnnUtGEyZAR8NGQkrNiKIYadoDi1dp5iSI+aNEw3RABA6Fzwx1aWQpgmakp0MKwcatYwAUS554ClXROFUhMAma7KoCYNE8ANHQorr1JLkSbRJoqTOpuR+co2NWOY3MGBT6lTsAi1VC7SJAOWXWrGMDkJQeg8KMawkWKI9CwKpRs5dT6DbFLVhqmUG5ElOMrRuaelYlYgFCdFm6Rns0fVGyaRJTiyElmG4oknyJcbB6wxwZAtqtIwMUrwceNtw4opS8IwUZyUniXSzA5VaZicYOAjs8xaKhahpCLSzA5VaZgAPmEFlGWRnkVxoiNQNqgaw1QKljQs+CiybOnjubKgrKePUTrSE3QgXarCMJnqDuIIK5xKE5EmCkWv/3SpCsMECMlqj9iWSJUjpolC6dyGdKhow1RvWCYuBp8sjrVEqNii3kuHijdMAB+l58PKpdKljkBMcIB8qecs9V/5qUjD5KHPEEepnmeZBTGNHooTlJeKNEwmKIYQ3USFlQlC1S7qwvJSkYYJEFKJw0daKqVlGXKCQqnNHspDRRkmd1IQRzWnYkORmkVxgvJQMYbJWEuIg4gLIToBlYuKMUyAEN1E1eoQEsZnolBMalB6KsIwScU2z+XLl8OionDw4MGwKDOEFUYtKe2hJv/yne+Y2WNG55VLG177Q16Zr91L3mRShhKJOWdLS0UYJndO8ezevdts377ddOnSxf5GI0eODDdpMxMmTAiLMgG9YtOVzreFL4zLK5dWTJ6UV+Zr8ogRZsAv/teMeXRw3jrUNinjQtNV6agIw4R4OnToEGtoN27cMFevXo2Wr127Zl+PHTsWvXecPHkyer9p0yZz6tQps3LlSrNmzRrTvn17WzG2a9fOLF261NsrfdxDdmtdabThKrLU5777h1ftcv2gR0zXH/wgWj9p+HD7umDc82bLvDfy9p/aeGOXxveuFdFrtnRgmBVM165dzYjGu/W6ujpz991320po0aJFZs6cOaZTp052m1WrVpkFCxaYCxcu2PUyQcedd95pywYNGmSXH3vsMbte2rhxo3nggQfM4MGDrQFniVrqFducyt1r9pM/LbXnjKSblnFPPmF63NvZvrptXnr6KbN6+jRzR+N5NPe5Z/OOMbAxusQwSysoDZk1TLVblioV26dPH7N+/fqcskuXLpnf/va3ZteuXTnlWUa/z4wZM8Jii0xT67du3WqXe/fuHa3r37+/OXz4sDlw4IBdPn36tNm/f7+ZOnWqOX/+fLSd6Nevn31taGjIKU8LKtoUtX2b/f0fbbx+9Kp2TJX/Z4d/t++/em+DXdY6mWXe/t9KEdDSiRPMiP4Pm5EDfmNm1o3K2wa1TfqN6TVbfDJtmKXKxbs75B49ekSpRqUqXbkMxe9odObMGTNv3jwzZswYu06Gu2fPnmh9WrjoUKbWrVs307dvX/OXv/zFmr5Lpz7zzDN2244dO5rnn3/e7Nixw37/r776ysyePdumYLUso5TJhiiKFdombdxNVFg5oDKo0SxHDRxgfnjXXWZov77WIGfV15lP31phLmzbapZPesV8/447zNebN5kh999vo0516glT56c3vW8aZkw357fe+l9K2ifv81CbpN+9VAFHLZNZwywlapO7efOmfX/o0KEo+howYIB9vX79ulm3bp0ZO3asTVMqPSkzkSllCbVTnjhxIiw2w4cPz2urVHunUqtKzTr0d547dy5ajku9qo20vr4+LE6FsFJAt1Xq1OybL71oPlv9drSsCPGtKZOtWf6y8bpQlKnOPFqWtM3Rde/EmqE6C8k03fKRd9bmbYOKIygumTTMUkWWDt15de/e3Rqn3m/evNmWa7lnz57Rne/Ro7e7aM+cOdP06tUrWq40XJtmJRNWBui20hxigrKrzQ1rw8sI2kDmDFNpt1Ln3tUxJuT48eM22myKadOmRenJSqSpts5KgVQsQi0XqdnikjnDLAfTp08Pi8yXX35ZsMOP2jA58dIhrARQ02IyABQnKA6ZM8xyzOoTtu8lQb1os9DRpxYJO46gplUuw/z7extsx52wHGVT5ahXa4FMGWap2y6h8lB6Prz4UWGVoz1T2ZamZvpB2ROp2eKQKcMECAkvfNS8St1jVr1gVfmunDolbx3KrugA1HYyY5il7ugDlYceWRRe9ChdhTP9aKL1vcuXmX/97ndtivaLtQ12jOawXz9k07baR9v6U+Q9/PP7zF3f+549ll61/qM3/2gG9+ljx3DqWA/d1zPvs1HbRRavbWTGMPlHQkitProry5LBydScYWq+WJVpHKZMb//KFXb5nVkzo320rcZdjh3yaLS8cfZsa6x1jwy0+742+vd21h+to220dCIt2zYyY5gAPswX2zapHbOoqdkmZvqRye1/a4Xd5qkH+9lXpWwPr1ltK+cZo35n95EUObrZgLSdjFLT6Z3b8qFd1vHcdHuoNCIt2zYwTMgk4YWOWq5ijl3VLD6+mWmu2KcfejAnknRPLLnn+/9mxg990hqi3s977tkoypRhuu1d6lXHvr/7T+zsQcX8zihfl/d/Gl5q0AJSN0xdIKRjwUfnBOlYhEojpdIZZtI6MmGYAD5EGQiVVnSybB2pGyZASHhxo9bLds4pw7hMVFmC1pGq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>