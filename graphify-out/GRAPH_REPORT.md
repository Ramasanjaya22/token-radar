# Graph Report - token-radar  (2026-11-15)

## Corpus Check
- Corpus is ~11,248 words - fits in a single context window. You may not need a graph.

## Summary
- 182 nodes · 337 edges · 9 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Radar Value Model
- Dashboard Scripts
- Dossier and Build Tooling
- Dashboard Layout and Filters
- Pipeline Entry Point
- Test Suite
- Dashboard Screenshot: Board
- Snapshot and Farm Plan Screenshot
- Filtered Lending View Screenshot

## God Nodes (most connected - your core abstractions)
1. `buildDossier()` - 14 edges
2. `render()` - 11 edges
3. `buildRadar()` - 11 edges
4. `openDetail()` - 10 edges
5. `buildBoard()` - 9 edges
6. `makeSnapshot()` - 8 edges
7. `makeProtocol()` - 8 edges
8. `makePreTokenProtocol()` - 8 edges
9. `radar-2 value model` - 8 edges
10. `rowHtml()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Model section (formula and note)` --semantically_similar_to--> `radar-2 value model`  [INFERRED] [semantically similar]
  dashboard/index.html → README.md
- `data.js (loaded by dashboard)` --semantically_similar_to--> `out/data.js`  [INFERRED] [semantically similar]
  dashboard/index.html → README.md
- `Pre-token / Live token view tabs` --conceptually_related_to--> `Live-token protocols`  [INFERRED]
  dashboard/index.html → README.md
- `stageAndInstall()` --calls--> `dataScript()`  [EXTRACTED]
  main.ts → lib/model.ts
- `pre()` --calls--> `makePreTokenProtocol()`  [EXTRACTED]
  tests/age-growth-value.test.mjs → tests/helpers/snapshot.mjs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **radar-2 implied value factors** — readme_radar_2_value_model, readme_growth_factor, readme_maturity_factor, readme_scarcity_factor [EXTRACTED 1.00]
- **Dashboard page assets** — dashboard_index_html, dashboard_index_app_css, dashboard_app, dashboard_index_data_js [EXTRACTED 1.00]
- **Board page layout: header, model panel, filters, ranked table** — screenshots_01_board_header_stats, screenshots_01_board_model_panel, screenshots_01_board_filter_controls, screenshots_01_board_ranked_table [EXTRACTED 1.00]
- **Detail panel sections for a protocol** — screenshots_02_detail_snapshot_section, screenshots_02_detail_radar2_breakdown, screenshots_02_detail_farm_plan [EXTRACTED 1.00]
- **Token Radar page layout: header, model panel, filters, board** — screenshots_03_filtered_token_radar_header, screenshots_03_filtered_model_panel, screenshots_03_filtered_filter_controls, screenshots_03_filtered_pretoken_board [EXTRACTED 0.95]

## Communities (9 total, 0 thin omitted)

### Community 0 - "Radar Value Model"
Cohesion: 0.11
Nodes (36): actionFor(), ageDays(), boardIssue(), BoardRow, buildBoard(), buildRadar(), bySlug(), candidates() (+28 more)

### Community 1 - "Dashboard Scripts"
Cohesion: 0.18
Nodes (25): boot(), buildFilters(), cell(), closeDetail(), el(), esc(), fillSelect(), fmtAge() (+17 more)

### Community 2 - "Dossier and Build Tooling"
Cohesion: 0.13
Nodes (23): buildDossier(), byCodeUnit(), byteLength(), canonicalJson(), dashboardFiles(), DashFile, DOSSIER_MAX_BYTES, DOSSIER_MAX_IMAGES (+15 more)

### Community 3 - "Dashboard Layout and Filters"
Cohesion: 0.13
Nodes (20): app.css, Sortable board table, Filters: search, category, chain, view tabs, reset, data.js (loaded by dashboard), Protocol detail panel, Model section (formula and note), No-data alert, Pre-token / Live token view tabs (+12 more)

### Community 4 - "Pipeline Entry Point"
Cohesion: 0.11
Nodes (16): dataScript(), parseSnapshot(), SnapshotError, arg(), { board, radar }, copyFiles(), dashboardDir, fail() (+8 more)

### Community 5 - "Test Suite"
Cohesion: 0.23
Nodes (8): MODEL, pre(), makePreTokenProtocol(), makeProtocol(), makeSnapshot(), goodSnapshot(), made, root

### Community 6 - "Dashboard Screenshot: Board"
Cohesion: 0.17
Nodes (11): Filter controls (search, category, chain, view toggle, reset), Gauntlet (rank 2, $365.9M implied), Header stats (As of 2026-11-14, Protocols 250, Board 226, Watchlist 40), Implied value formula: tvl x 0.3 x growth x maturity x scarcity, Pre-token board ranked table (226 rows), Token Radar board screenshot (dark UI), Steakhouse Financial (rank 1, $612.0M implied), Columns: Rank, Protocol, Category, Chain, TVL, 7D, Age, Implied (+3 more)

### Community 7 - "Snapshot and Farm Plan Screenshot"
Cohesion: 0.36
Nodes (6): DefiLlama protocols API (data source), Farm plan: six-step airdrop farming plan with cost and time per step, Footer note: 226 pre-token protocols, data sealed from DefiLlama, Steakhouse Financial detail panel screenshot (Token Radar), Snapshot section (TVL $2.75B, 7-day change -2.2%, age 17.9 months, listed 2025-05-20), Steakhouse Financial (steakhouse-financial, Risk Curators protocol)

### Community 8 - "Filtered Lending View Screenshot"
Cohesion: 0.38
Nodes (5): Filter controls (search, category, chain, view toggle, reset), The model panel (radar-2 implied value formula), Pre-token board table (rank, protocol, category, chain, TVL, 7D, age, implied), Token Radar filtered view screenshot (Lending category, pre-token board), Token Radar header (title, tagline, as-of 2026-11-14, 250 protocols, 226 board, 40 watchlist)

## Knowledge Gaps
- **15 isolated node(s):** `growth factor`, `maturity factor`, `scarcity factor`, `make.fun bounty token-radar-01`, `app.css` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 59 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `buildDossier()` connect `Dossier and Build Tooling` to `Pipeline Entry Point`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `growth factor`, `maturity factor`, `scarcity factor` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Radar Value Model` be split into smaller, more focused modules?**
  _Cohesion score 0.1066066066066066 - nodes in this community are weakly interconnected._
- **Why does `buildRadar()` connect `Radar Value Model` to `Pipeline Entry Point`, `Test Suite`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `Dossier and Build Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Should `Dashboard Layout and Filters` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `Pipeline Entry Point` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._