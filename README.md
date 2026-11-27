# Gobble Dash — Turkey's Last Thanksgiving

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/deedath123/best-turkey-escape-game-20261127/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/deedath123/best-turkey-escape-game-20261127/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Entry for the make.fun bounty **turkey-run-game-01** — "Make the best turkey
escape game" ($250 escrowed, top 20 paid).

## The game

Thanksgiving is tomorrow. The farmer has the oven lit and the carving knife
out. You are the turkey. Run 1000m from the farmyard, through the barn, across
the kitchen, and out the forest gate — or end up on the platter.

- **Run, jump, flap, hide** — Space / click to jump and double-flap, ↓ to duck
  and hide behind haybales and break the farmer's line of sight.
- **The farmer chases** — he closes in when you stumble, sprints when his
  spotted meter fills, and searches the yard when you slip too far ahead.
  Get caught three times and dinner is served.
- **Dangers that grow** — hay bales and fences in the farmyard, pitchforks in
  the barn, and in the kitchen a lit oven with fire jets plus falling carving
  knives.
- **A reason to run again** — corn and golden corn for score, feathers for a
  dash burst, a distance bar to the forest gate, and a best-distance record.
- **Feel** — synthesized WebAudio gobbles, flaps, dings and fanfares (no audio
  files), a plucky music loop, hit flashes, floating score popups, and a
  pause (P) and mute (M).

## How to run it

Serve `game/` with any static server and open `game/index.html`:

```sh
python3 -m http.server 8080 --directory game
```

or, from the repository root:

```sh
node --experimental-strip-types main.ts
```

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to
`MAKEFUN_OUTPUT_DIR` (or `/output`) and writes `dossier.json` there. It is
deterministic: two runs write byte-identical output.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning, palette, stages, helpers
- `game/src/input.js` — keyboard + mouse input
- `game/src/audio.js` — synthesized WebAudio sound effects and music
- `game/src/world.js` — run state, spawning, farmer AI, collisions, score
- `game/src/render.js` — all canvas art, HUD, title and end screens
- `game/src/main.js` — the loop, state machine and `?shot=` screenshot hooks
- `vendor/makefun-game.ts` — the kit's dossier library, copied unchanged

## License

MIT — see [LICENSE](LICENSE).
