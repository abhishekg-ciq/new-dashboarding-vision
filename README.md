# Ally — CommerceIQ Analytics Product Prototype

Clickable live web prototype of an agentic retail-analytics product for Amazon
performance — CommerceIQ's tailored answer to a Wisdom-AI-style platform.

Three co-equal consumer surfaces (**Dashboards**, **Alerts**, **Chat / Ask Ally**)
+ a **Workflows library** (RCA built deep) + full **Builder mode** (Data, Semantic /
Context, Skills, Alert & Agent builder), all reading from one **semantic engine**
that computes deterministically.

Two seeded clients (New Balance, Nestlé) demonstrate per-client reshape: same
engine, different skill, different first suspect, different drill order.

## Run

Requires Node 18+.

```bash
cd ally
npm install
npm run dev          # http://localhost:3000
npm test             # smoke test over the semantic + RCA engine
```

Live Ally narration (optional — without it, the scripted fallback covers the
demo scenarios end-to-end):

```bash
export ANTHROPIC_API_KEY=sk-ant-…
# optional: export ANTHROPIC_MODEL=claude-sonnet-4-6
npm run dev
```

## Demo (acceptance §11 walkthrough)

1. **Pulse** (`/` — New Balance, Client mode) — KPI tiles, top 3 alerts, suggested
   prompt chips.
2. **Chat** (`/chat`) — ask *"how are sales tracking vs plan?"* → intent
   resolution chip → engine returns ≈ −16% with a trend chart and grounded
   narrative. **Pin** the result → it appears under Dashboards › *Pinned from
   Chat*. **Save** the question → it lands in Builder › Semantic › Golden Query
   Bank as a candidate.
3. **Dashboards** (`/dashboards/gap-to-plan`) — drill brand → category → SKU,
   toggle PvP / YoY / vsPlan, click **Investigate** on the anomalous SKU widget.
4. **RCA workflow canvas** — first pass already computed before any LLM call
   (units −8% / ASP −9%, conversion is the dominant lever, 1080 worst). Click
   *expand → Is Organic SOV down?* → placement branch with a computed card.
   Type a frontier hypothesis (e.g. *"top-of-page intent shift?"*) and inject →
   flagged frontier card. Click **Generate recommendation** → rationale +
   suggested actions; **Pin** to dashboard.
5. **Override → Graduate** — click *Override → Graduate*, reorder the drill,
   confirm → NB skill updates with an audit-trailed graduated edit (visible in
   Builder › Skills).
6. **Alerts** (`/alerts`) — open an alert, **Investigate** — confirms the same
   workflow entry works from this surface.
7. **Builder mode** — toggle in the top bar:
    - **Skills** — switch client to Nestlé (or edit NB drill order / primary
      metric) → re-run active workflow → canvas reshapes: category-first,
      availability surfaces, shipped revenue.
    - **Semantic** — mark the chat query as a reviewed golden query.
    - **Alerts & Agents** — define *"gap > 10% → run RCA → Slack"*, click
      **Simulate trigger** → a notification appears and a ready-to-review
      investigation lands in Workflows.
8. Everything in 1–7 works with `ANTHROPIC_API_KEY` set **and** unset.

## Architecture

```
app/                                 # Next.js App Router
  api/ally/route.ts                  # /api/ally — live + scripted fallback
  page.tsx                           # Pulse
  chat/                              # Ask Ally
  dashboards/[id]/                   # Pre-built + pinned dashboards
  alerts/                            # Computed ranked alerts (DEEP)
  workflows/                         # Templates library
    rca/[id]/                        # RCA canvas (DEEP) — first pass + expand
  recommendations/                   # Output surface
  builder/
    data/                            # Data & Domain (FUNCTIONAL)
    semantic/                        # Definitions + golden-query bank (DEEP-ish)
    skills/                          # Per-client SkillFile editor (DEEP)
    agents/                          # Alert + agent builder + Simulate (DEEP)

lib/
  semantic/                          # the spine
    registry.ts                      # metric catalogue (rcaNodes via mapMetric)
    intent.ts                        # NL → SemanticIntent (no SQL)
    compute.ts                       # deterministic compute over mock data
  rca/
    mapping.ts                       # ported v1 mapping table (rcaQuestions,
                                     # alertNames, mappingRules, mapMetric)
    tree.ts                          # L0–L3 tree
    engine.ts                        # decomposeGap, attributeUnits,
                                     # rankContributors, runFirstPass,
                                     # expandNode, generateRecommendation,
                                     # diffInvestigations
  data/                              # two engineered datasets
    newbalance.ts                    # placement / conversion / mix-shift story
    nestle.ts                        # availability / PO-fill story
  skills/                            # per-client SkillFile defaults
  alerts/generator.ts                # computed alert taxonomy
  ally/                              # Ally route helpers
    client.ts                        # fetch wrapper used by every surface
    fallback.ts                      # scripted responses keyed to §11
    systemPrompt.ts                  # contract for live Claude calls
  state/store.ts                     # localStorage-backed hooks

components/
  Shell.tsx                          # top bar (client switcher + mode toggle) +
                                     # side nav + omnipresent ChatDock
  ChatDock.tsx                       # chat layer available across surfaces
  Widget.tsx                         # one widget = one SemanticIntent
  EvidenceCard.tsx                   # the RCA canvas building block
  AllyMessage.tsx                    # intent → result → narrative card
  IntentResolution.tsx               # the {metric, dims, tf, comparison} chip
  KpiTile.tsx · MiniChart.tsx · SuggestedPrompts.tsx
```

## Principles (also in the spec)

1. **One semantic engine, many surfaces.** Dashboards, Alerts, Chat, and
   Workflows all read from `lib/semantic/` + `lib/rca/`. They never compute
   independently.
2. **NL → semantic intent, not NL → SQL.** Ally resolves `{ metric, dimensions,
   filters, timeframe, comparison }` against the registry. The engine computes.
3. **Deterministic math, LLM narrative.** Every figure on screen is computed in
   code. The LLM picks intent, narrates results, proposes the next branch.
4. **Fix the grammar, flex the instantiation.** `Revenue = GV × Conversion ×
   ASP` and the L0–L3 tree are invariant. The per-client `SkillFile` flexes:
   primary metric, drill order, first-suspect prior, thresholds, custom context.
5. **Two modes, one app.** Top-bar toggle switches Client (consume; guardrailed)
   vs Builder (CSM / FDE; setup + config).

## Non-goals (from §12 — not built on purpose)

Real warehouse connections · NL → SQL generation/execution · autonomous agents
that take action · real auth / RBAC / SSO · real Slack / email · scheduled jobs
· cross-warehouse federation · unstructured-document support · real PPT / PDF
export · streaming token rendering.
