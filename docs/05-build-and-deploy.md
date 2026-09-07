# Build and deploy

**Written:** 2026-09-07
**Status:** working. Verified locally, both with and without the base path.

## The setup

Next.js builds the site to **plain static files** — HTML, CSS, JavaScript, no
server — and GitHub Actions publishes them to GitHub Pages on every push.

This follows directly from the archive-first decision (`context.md` §5.0): with
no live feed there is nothing to poll, so there is nothing to keep running.
Static hosting is free, has no uptime to manage, and cannot be rate-limited.

```
push to branch
   → GitHub Actions: npm ci → typecheck → next build
   → ./out (static files)
   → GitHub Pages
   → https://dscw10.github.io/F1-world/
```

**The iteration cycle:** push, wait about two minutes, look at the URL.

---

## One-time setup Chris needs to do

The workflow cannot switch Pages on by itself. Once, in the browser:

1. Go to the repository on GitHub → **Settings** → **Pages**
2. Under **Source**, choose **GitHub Actions** (not "Deploy from a branch")
3. Save

That is all. The next push deploys, and the URL appears in the Actions run and
under Settings → Pages.

If Pages has never been enabled, the first workflow run fails at the deploy step
with a permissions error. That is the expected symptom, not a broken workflow —
enable Pages and re-run it from the Actions tab.

---

## Versions, and two constraints from the archive that are now gone

| | Version |
|---|---|
| Node | 22 |
| Next.js | 16.3 |
| React | 19.2 |
| TypeScript | 7.0 |

The August build recorded two hard constraints that no longer apply, both worth
stating so nobody reintroduces the workarounds:

- **"Do not upgrade to Next 16 — it breaks the `@/` import alias."** That was
  true when the alias was declared as webpack configuration to make Cesium
  compile. Cesium is gone, the alias comes from `tsconfig.json`, and Turbopack
  reads it natively. Next 16 is fine.
- **"Pin TypeScript to ^5.7 — Next 15 cannot use TS 7."** Next 16 can.
  TypeScript 7 type-checks the project in under a second.

`npm install` also reports **0 vulnerabilities**, so the whole `npm audit`
assessment in the archive (§13 there) is moot. It was a Next 15 problem.

---

## Two failure modes that are designed out, and look like something else

Both of these produce a *plausible wrong result* rather than an error, which is
the class of bug this project keeps recording.

### 1. The sub-path — a page with no styling

GitHub Pages serves a project repository from a sub-path
(`/F1-world/`), not the domain root. If assets are requested from `/` the HTML
loads fine and every stylesheet and script 404s. The result reads as "the CSS is
broken", not as "the paths are wrong".

Handled by `NEXT_PUBLIC_BASE_PATH`, set by the workflow from the repository
name and applied in `next.config.mjs`. Locally it is unset, so `npm run dev`
serves from the root as usual.

**Verified:** a build with the variable set emits
`/F1-world/_next/static/...`; without it, `/_next/static/...`.

**If the repository is ever renamed, this fixes itself** — the workflow reads
the name at build time rather than hardcoding it. Which matters, because the
name has to change: it cannot contain "F1".

### 2. `.nojekyll` — the same symptom, a different cause

GitHub Pages runs Jekyll by default, and Jekyll ignores every directory whose
name starts with an underscore. Next puts all its output in `_next`. Without an
empty `.nojekyll` file at the root of the published site, the result is again a
bare unstyled page with no error.

Handled by `public/.nojekyll`, which Next copies into `out/`.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server at localhost:3000, hot reload |
| `npm run build` | Production build into `./out` |
| `npm run typecheck` | Type check without building |

To reproduce exactly what the deploy produces:

```bash
NEXT_PUBLIC_BASE_PATH=/F1-world npm run build
```

Note that opening `out/index.html` directly from the filesystem after that will
show an unstyled page — the assets are at `/F1-world/...`, which is correct on
the server and wrong on a local disk. Use `npm run dev` for local viewing.

---

## What is deployed right now

A **foundations page**: the project's current status, and the design tokens
rendered on a real screen — colour ramps, semantic tokens, the type scale,
spacing, provenance tiers, touch targets.

It has two jobs, and neither is being the product:

1. Prove the build-and-deploy chain works end to end.
2. Give the token set somewhere to be looked at and argued with.

**The colour and type values are placeholders**, structured to match what the
archive records about Chris's *F1 Data Viz Design System* but not taken from it.
When the Figma file is available they get replaced in `styles/tokens.css` once,
and every screen built afterwards inherits them.
