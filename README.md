# One Planet Under Pressure

An original, deterministic editorial infographic for make.fun's 20 November 2026
world-news image bounty. `main.ts` copies the finished image to
`/output/entry.png`; it uses only Node.js built-ins, reads no network data, and
writes the same PNG bytes on every run.

The image brings together three stories reported on 20 November:

- Russian attacks on Ukraine reached Polish airspace.
- COP31 climate negotiations in Antalya ran into overtime amid divisions on
  fossil fuels and climate finance.
- The race for the next UN secretary-general exposed divisions among world
  powers, including reports of UK and French opposition to the UAE candidate.

The illustration is original and uses no third-party photographs or artwork.
The reporting references are [The Guardian's 20 November world roundup](https://www.theguardian.com/world/2026/nov/20/all),
its [Poland and Ukraine report](https://www.theguardian.com/world/2026/nov/20/russian-missiles-drone-poland-attacks-ukraine),
and its [COP31 live coverage](https://www.theguardian.com/world/live/2026/nov/20/cop31-climate-crisis-talks-turkey-latest-news-updates).

To regenerate the committed asset with Node.js:

```sh
node render.mjs
```

To run the entry locally:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```
