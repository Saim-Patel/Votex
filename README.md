# VOTEX — 3D Online Voting Demo

A futuristic, fully client-side voting interface with neon blue/purple styling, 3D animations and a live results dashboard.

> **Educational demonstration only.** VOTEX uses fictional candidates and is not suitable for real elections. A `localStorage` flag can be cleared or bypassed by anyone, and there is no identity verification, server-side validation or audit trail.

## Features

- Dark neon UI with a rotating 3D cube, particle background and tilt-on-hover candidate cards
- Four fictional candidates with profile pop-ups and agendas
- Keyboard-accessible voting booth (arrow keys + Space/Enter)
- One demo vote per browser, stored in `localStorage`
- Confirmation pop-up before a vote is cast, plus a demo receipt
- Live results: animated bars, percentages, donut chart, total votes, lead margin
- Optional live simulation of random votes, and cross-tab sync
- Reset demo button (with confirmation)
- Responsive layout (mobile menu, stacked cards) and `prefers-reduced-motion` support

## Files

```
index.html   page structure
style.css    styling, 3D effects, responsive rules
script.js    voting logic, localStorage, results, animations
README.md    this file
```

No build step and no dependencies (only Google Fonts, with system-font fallbacks).

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repository (for example `votex`).
2. Upload `index.html`, `style.css`, `script.js` and `README.md` to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
5. After a minute your site is live at `https://<your-username>.github.io/votex/`.

## How the demo works

| Item | Detail |
| --- | --- |
| Vote record | `localStorage` key `votex.vote.v1` |
| Tally | `localStorage` key `votex.tally.v1`, starting from seeded sample numbers |
| Reset | Deletes both keys and restores the seeded tally |

The seeded numbers (128 / 97 / 84 / 61) exist only so the dashboard has something to display. Edit `SEED` and `CANDIDATES` at the top of `script.js` to customise.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari.
