# Road-Ranger frontend

This is a standalone, light-themed frontend for the existing Road-Ranger FastAPI service. It does not modify the backend, database, schemas, or route behavior.

## Run locally

From the project root:

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory frontend
```

Open `http://localhost:4173`.

## Connect to FastAPI

The app defaults to same-origin requests. When the API runs elsewhere, set the API base before `app.js` loads:

```html
<script>window.API_BASE = 'http://127.0.0.1:8000';</script>
<script src="./app.js" defer></script>
```

The UI already maps to the existing endpoints for report creation and listing, media upload, status updates, citizen summaries and profiles, and citizen authentication-compatible account data. The authority workspace provides dashboard, queue, citizen ledger, analytics, report inspection and address actions. The citizen workspace provides landing selection, report creation, evidence upload, coordinate capture input, report tracking, rewards and account summary.
