# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Ramasanjaya22/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Ramasanjaya22/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: it reads a sealed DefiLlama snapshot of 758 protocols, ranks the 226 pre-token
ones by the value a launch could carry, and gives each a farm plan with what every step costs and how
long it takes. Live-token protocols are set aside and priced by the market, never by the model.

The value model, `radar-2`, uses only the snapshot's own figures — TVL, the 7-day change and how many
days the protocol has run without a token:

```
implied = tvl × 0.3 × growth × maturity × scarcity
growth   = 1 + clamp(7d, −70%, 150%) × 0.55
maturity = 0.5 + min(age, 1460)/1460 × 0.5
scarcity = 1 + min(age, 1460)/1460 × 0.25
```

The dashboard is one static page, no framework and no network: a sortable filterable board, a Live
token view, and a detail panel per protocol that recomputes the model's own arithmetic from the
snapshot's numbers and prints the farm plan.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Then open `out/dashboard/index.html` beside `out/data.js`. Under the grader the program runs with the
sealed snapshot at `/input/snapshot.json` and `/output` writable, Node 22, standard library only.

---

<sub>Entered on [make.fun](https://make.fun/?ref=11xbc6dc&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>