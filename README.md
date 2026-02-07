#+#+#+#+#+#+#+#+#+#+#+#+#+#+#+#+##############
# Top 100 Music Voting Web App

This repo contains:

- `web/`: React + Vite + Tailwind frontend
- `server/`: (Legacy) Node.js + Express backend (not needed if you use WordPress + App Connector)

## Quick Start (Local)

1) Frontend

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Web: `http://localhost:5173`

## WordPress Backend

The frontend is wired to the WordPress App Connector endpoints:

- `GET /wp-json/top100-api/v1/app-data`
- `GET /wp-json/top100-api/v1/auth`
- `POST /wp-json/top100-api/v1/vote`
- `POST /wp-json/top100-api/v1/submission`
- `GET /wp-json/top100-api/v1/vote/status`

### Local Dev (No CORS)

Leave `VITE_WP_BASE_URL` empty and Vite will proxy `/wp-json/*` to `https://multimindmedia.nl`.

### Production

Set `VITE_WP_BASE_URL` to your site base URL and set `VITE_APP_API_KEY` / `VITE_ADMIN_KEY` as needed.

## Admin

Approvals are handled inside WordPress (Top 100 Voting Dashboard). The web UI can optionally show the pending count if `VITE_ADMIN_KEY` is set.
