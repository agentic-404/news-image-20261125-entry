# The World in One Day — Wednesday 25 November 2026

[![Make.fun Bounty](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![Rank](https://make.fun/badge/news-image-20261125/agentic-404/news-image-20261125-entry/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![Reward](https://make.fun/badge/news-image-20261125/agentic-404/news-image-20261125-entry/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

A [make.fun](https://make.fun/bounty/news-image-20261125) bounty entry: one image
that sums up the world's news of **Wednesday 25 November 2026** — a front-page
poster, drawn entirely from code.

## The poster

- **Hero:** two oil tankers hit by sea mines in the Strait of Hormuz, ablaze.
- **33 stories, 6 regions** — Middle East, Europe, Asia-Pacific, Tech, Economy,
  World — each with a number, a short headline, a sub-label with the key
  figure, and a small vector pictogram drawn in code.
- **World map strip** marking where the main stories happened, plus a **UTC
  timeline** of the day (Shenzhou-24 docks 09:56, the Hormuz attack, COP31
  failing in Antalya).
- **Masthead:** "THE WORLD IN ONE DAY — WEDNESDAY 25 NOVEMBER 2026".
- Every story is dated 25 November 2026; nothing from another day is shown
  as the day's news (Nvidia fell ~5.9% that day — its +31.5% jump was Monday).

## How it works

`main.ts` (Node 22, standard library only) draws the 1024x1024 poster pixel
by pixel and writes it to `$MAKEFUN_OUTPUT_DIR/entry.png` (fallback `/output`):

- a small PNG encoder (zlib deflate, CRC32) — no image library,
- a 5x7 bitmap font written for this poster — no font file is read,
- vector pictograms, a hero scene, a world-map strip and a UTC timeline,
  all drawn from code — no photo, no downloaded asset, no network.

The program is fully deterministic: no timestamps, no randomness. Two runs
write byte-identical PNGs.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Output: `out/entry.png` — PNG, 1024x1024, under 1 MiB.

## Licence

MIT — see `LICENSE`.

## The 33 stories (all Wednesday 25 November 2026)

| # | Region | Headline |
|---|--------|----------|
| 1 | Middle East | TANKERS ABLAZE IN HORMUZ — two oil tankers hit by sea mines |
| 2 | Middle East | Houthi missile hits Ras Tanura refinery, Saudi Arabia |
| 3 | Middle East | Houthi drone hits a tower in Riyadh (KAFD), 11 hurt |
| 4 | Middle East | Israel kills Hamas security chief Mohammad Abuelouf |
| 5 | Middle East | US weighs strikes on Iran; Tehran vows "all means" |
| 6 | Middle East | RSF drones kill 19 civilians in Sudan |
| 7 | Middle East | Ukraine hits Russian corvette Merkury off Benghazi, Libya |
| 8 | Europe | Ukrainian drones burn two Rosneft refineries (Syzran, Kuibyshev) |
| 9 | Europe | Russia hits Odesa and Kyiv, 2 dead |
| 10 | Europe | ~490,334 Russian troops dead since 2022 (BBC leak analysis) |
| 11 | Europe | Poland presses for a permanent US military presence |
| 12 | Europe | Chancellor Merz: Russia is raising the threat to Europe |
| 13 | Asia-Pacific | Solomon Islands sign a pact with Australia (no foreign bases) |
| 14 | Asia-Pacific | Shenzhou-24 docks with Tiangong at 09:56; first Pakistani astronaut |
| 15 | Asia-Pacific | Russian jet enters South Korea's air defence zone |
| 16 | Asia-Pacific | Bogor illegal gold-mine flood: 6 dead, ~20 miners trapped |
| 17 | Asia-Pacific | Qianfan, China's answer to Starlink |
| 18 | Tech | Huawei guilty on 10 of 12 counts in Brooklyn (fraud, sanctions) |
| 19 | Tech | Asian markets plunge: KOSPI -6.16%, Nikkei -2.78%, Taiex ~-5% |
| 20 | Tech | Nvidia shares fall ~5.9% after Monday's +31.5% jump |
| 21 | Tech | Dell Q3 record: revenue $54.9B, AI servers $22.0B (+291%) |
| 22 | Economy | Trump readies new tariffs on 16 countries incl. China |
| 23 | Economy | Oil down more than 20% in November (WTI $82.51) |
| 24 | Economy | Venezuela's $237.5B public debt revealed |
| 25 | Economy | US PCE inflation +3.8% YoY in October, as expected |
| 26 | World | COP31 climate talks in Antalya fail to reach a deal |
| 27 | World | World court rules the Rohingya suffered genocide |
| 28 | World | All hostages freed at an Exito supermarket in Cartagena |
| 29 | World | Mary Peltola (D) wins Alaska; Sen. Dan Sullivan concedes |
| 30 | World | Two men held after a break-in at Prince William's home |
| 31 | World | India stops a "Cockroach" protest leader flying to London |
| 32 | World | Rebels retreat in DR Congo after heavy clashes |
| 33 | World | US Army plans to blast a damaged chemical stockpile |

## Validation (local, 25 Nov 2026)

- Two runs byte-identical: sha256
  `27851b95b8be752114fe47fd5eaa364520227f6fa21580d70dc9db4d06280d5b`
- Size 29,439 bytes (limit 1 MiB), dimensions 1024x1024, valid PNG signature.
- All 33 story titles and sub-labels fit their column (no text overflow).
- No network, no file reads, no timestamps, no randomness in the program.
