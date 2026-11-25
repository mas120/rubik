# Rubik tutorial app

React + TypeScript + Vite + three.js. UI text is Vietnamese. Deployed to GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

## Commands

- `npm ci` — install
- `npm run dev` — dev server on http://localhost:5173
- `npm run lint`, `npm test`, `npm run build` — must all pass before pushing (CI runs the same)

## Debug URLs

- `?screen=input[&size=4]`, `?screen=free[&size=4]`, `?screen=basics[&size=4]`
- `?demo=<seed>[&at=<cursor>][&size=4]` — lesson on a seeded scramble

## Workflow preferences (owner)

- After finishing each feature: commit it and push to `main` right away so the live site updates. No need to ask first.
- The owner is not a developer: explain in plain Vietnamese, avoid git/dev jargon.
- The app targets complete beginners: every screen must explain what to do in plain words.
- Git identity is not configured on this machine. Commit as the owner without changing git config: `git -c user.name="mas120" -c user.email="19644493+mas120@users.noreply.github.com" commit ...`
