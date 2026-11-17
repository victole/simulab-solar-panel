# AGENTS.md

A solar-panel simulator for a house in Tandil, Argentina (37.3° S, 59.13° W, UTC−3). It computes where the sun is, how much light the panel gets, and the shade from a tree and from clouds. It compares the theory with the owner's real Huawei inverter data, to find out whether the panel is mounted correctly.

## Rules

- **One app.** Everything ships in `./index.html`, one offline file built by `./build.sh`. All source sits flat in the project root; never add a second page, app, or `labs/` folder, and never use "lab" or "Lab 05" in titles or text.
- **Play/pause is manual.** Changing a setting must never start playback. The app opens paused in free mode. `liveSet` and `liveStart` are wrapped in `demo.js` so they keep the playing state; any new control must do the same.
- **The UI is in Spanish (Argentina).**
- **The model is the only source of numbers.** `model.js` holds pure functions with no drawing. `demo.js` only reads from it. Every constant needs a source in the `note` of `demo.json`, or is labelled as an assumption.
- **Data:** simulated data must say it is simulated. Never invent inverter readings and present them as real.

## Layout

- `model.js`: sun position (`pvSun`, `pvEoT`), light on the panel (`pvAt`, `pvNow`), year totals (`pvYear`, `pvBest`, `pvShare`), the moving cloud field (`pvClouds`), tree shade, and the CSV reader and diagnosis (`pvParseCSV`, `pvDiagnose`).
- `demo.js`: the SIMULAB `DEMO` contract (timeline, state, draw, bays, knobs). It also holds the left sidebar (`spSidebar`), tree dragging, the data panel (`spDataPanel`, `spDataBays`) and the free-mode clock (FECHA + HORA knobs).
- `demo.json`: the title, the bundled files in order (`model.js`, `sim-data.js`, `demo.js`), and the note with sources and assumptions.
- `simular-csv.mjs`: writes `data/*.csv`, `data/tandil-simulado-verdad.json` and `sim-data.js`.
- `data/`: the test CSVs. `tandil-simulado-verdad.json` is the hidden truth: 25° tilt, 20° W, with a tree to the west-southwest.

## Commands

```sh
./build.sh            # build ./index.html
node check.mjs        # model checks; must all print "ok"
node simular-csv.mjs  # regenerate simulated data, then ./build.sh
```

- `./build.sh` needs the SIMULAB kit at `~/.claude/skills/simulab`, which is not in this repo. The kit's tools are `stills.mjs` (contact sheets), `video.sh` and `jumps.mjs`; run them against the project root (`.`).
- Check UI changes in a real browser with Playwright from the kit's `node_modules`. Load `index.html` and confirm there are no `pageerror` events. Look at screenshots for overlapping text.

## Model conventions

- Sun vectors are ENU (east, north, up). Azimuth: 0 = facing the equator, + = west.
- The scene maps ENU to world space with `enuW`, so the equator always sits at world +x. 1 scene unit = 0.4 m.
- Times: `clock` is local clock time and `solar` is solar time. Convert with `pvEoT` and the longitude.
- Expected key values: Tandil's best tilt is 33°, Madrid's is 36°. The diagnosis on the simulated CSV must land within ±3° of the truth.

## Deploy

- Repo: `git@github.com:victole/simulab-solar-panel.git`, branch `main`. Commits use `victole@gmail.com`.
- Vercel is connected to the repo: every push to `main` deploys https://simulab-solar-panel.vercel.app as a static `index.html`. Vercel runs no build step, so run `./build.sh` before committing.
- `render/` (video and audio), `dist/` and `shots/` are git-ignored, because they are large or regenerated.
