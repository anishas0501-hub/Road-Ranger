# Road-Ranger Frontend Plan

## Scope
Build a frontend-only single-page application in `frontend/` that integrates with the existing FastAPI backend without changing Python files, schemas, routes, or database behavior.

## Design direction
- **Design movement:** editorial civic utility, inspired by quiet Swiss dashboards and modern public-service wayfinding.
- **Core principles:** airy hierarchy, restrained chrome, clear task states, data-first surfaces.
- **Color philosophy:** warm paper background with ink text, graphite panels, and restrained signal colors for status and severity. No purple gradients and no dark mode.
- **Layout paradigm:** a left rail plus modular dashboard canvas; landing page uses two confident role blocks rather than a generic hero.
- **Signature elements:** chrome-like reflective headings, thin rules, compact status pills, and oversized numerical readouts.
- **Interaction philosophy:** direct, reversible actions with clear feedback; minimal motion limited to hover, loading, and route transitions.
- **Animation:** short opacity/translate transitions only; no scroll choreography.
- **Typography:** Space Grotesk for display and Inter for UI/body, with uppercase micro-labels and tight numeric treatments.
- **Brand essence:** a civic road intelligence desk for citizens and public works teams, built for fast reporting and accountable resolution. Personality: precise, calm, civic.
- **Brand voice:** plainspoken and action-led. Examples: “Report a road issue” and “Review the public works queue.”
- **Wordmark:** Road-Ranger wordmark paired with a four-spoke route mark.
- **Signature brand color:** signal green `#1f8f68`, used sparingly for confirmed/resolved states.

## Structure
- `frontend/index.html`: SPA shell and font/icon dependencies.
- `frontend/styles.css`: responsive visual system, landing page, app shell, dashboards, forms, tables, modals.
- `frontend/app.js`: state, routing, API client, citizen and authority workflows, rendering and event delegation.
- `frontend/manus-routes.json`: declared public routes for the frontend.

## Backend integration
The frontend calls the existing endpoints with a configurable `API_BASE` (defaults to same origin): auth OTP/register/login/profile, uploads, reports, citizen summaries/profile updates/avatar, and report status updates. Backend files remain unchanged.
