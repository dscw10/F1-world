# F1 Spatial Telemetry

Formula 1 telemetry read as geometry in space. Circuits are generated
procedurally from real GPS data and rendered on a 3D globe, with replayed
session data and an atmospheric weather layer composited on top.

For scope, decisions, and open questions, read `context.md`. It is the source
of truth; this file only tells you how to run the thing.

---

## Running it

You need [Node.js](https://nodejs.org) 20 or newer. Check with `node -v`.

### 1. Install

Open a terminal in this folder and run:

```bash
npm install
```

This takes a few minutes the first time — Cesium is a large package.

**npm will report 3 high severity vulnerabilities. Ignore them, and do not run
`npm audit fix --force`.** That command installs Next.js 16, which switches
bundler and would break every import in this project. Both flagged packages
(`postcss`, `sharp`) are unreachable in this app — the full reasoning is in
`context.md` §13.

### 2. Add a Cesium token (optional, but do it)

Without a token the app still runs, but the Ardennes flatten out and Spa loses
most of its point.

1. Sign up free at <https://ion.cesium.com/signup>
2. Open the **Access Tokens** tab and copy the default token
3. Copy `.env.example` to a new file named `.env.local`
4. Paste the token after `NEXT_PUBLIC_CESIUM_ION_TOKEN=`
5. **Restart the dev server.** Environment variables are read at startup only.

> **Windows warning — this one bites.** Notepad appends `.txt` to files unless
> you pick "All Files" in the save dialog, and Explorer hides known extensions,
> so `.env.local.txt` looks like `.env.local`. Next.js reads only `.env.local`,
> so the token is silently ignored. To check, run `dir /a` in the project folder
> and look at the real filename. Rename with:
>
> ```
> ren .env.local.txt .env.local
> ```

`.env.local` is git-ignored, so the token will not be committed.

### 3. Start it

```bash
npm run dev
```

First compile takes about 20–30 seconds. After that it is cached and near
instant. Open <http://localhost:3000>.

You should see a globe, and a **Descend** button. That flight down to the
circuit is the piece's opening move.

---

## About the data you are looking at

Out of the box this ships with a **placeholder** dataset — a generated
approximation of Spa's shape with ten simulated cars. It exists so the
rendering works before you download anything. The interface labels it as
placeholder data, and it will keep doing so until you replace it.

To get a real session:

```bash
cd pipeline
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# macOS / Linux:       source .venv/bin/activate
pip install -r requirements.txt

python export_session.py --year 2024 --gp Belgium --session R --verify
```

Full instructions, including how to add a circuit, are in
`pipeline/README.md`. **Read the section on georeferencing before you trust an
export** — that transform fails silently and convincingly.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server at localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | Type check without building |

Use plain `npm run dev` and `npm run build`. Do not add `--turbopack` — the
import alias is configured for webpack, and Turbopack will not see it.

---

## If something breaks

**A wall of `Module not found: '@/...'` errors.** The import alias is declared
in two places that must agree: `next.config.mjs` (for the bundler) and
`tsconfig.json` (for the type checker).

**`Cannot find Cesium in node_modules`.** Run `npm install`. The Cesium asset
copy step runs before dev and build and needs the package present.

**The globe is flat and grey.** No Cesium Ion token. See step 2 above.

**"No session data found".** `/public/data/spa/` is empty. Run
`python pipeline/make_placeholder.py` for test data, or the real export.

**Cars sit still, or all bunch at the start line.** The replay clock could not
match the session time range — usually a `startTime` in `replay.json` that
does not agree with the frame timestamps.
