# SOP-Guidelines

Finance and internal-control SOPs for Asia Strategic, plus the supporting
operational tooling.

## Contents

- [`docs/`](./docs) — Standard Operating Procedures (markdown)
  - `SOP_BOQ_Budget_Review.md`
  - `SOP_Vendor_Quotation_Comparison.md`
  - `SOP_Approved_Vendor_Management.md`
  - `POWER_APP_Build_Guide.md` — step-by-step guide to build the same
    tooling as a Dataverse + Model-driven Power App
  - `PowerApp_Import_Templates/` — CSVs ready to bulk-import into the
    Dataverse tables described in the build guide
- [`web-app/`](./web-app) — Node.js + React reference implementation of
  the same SOPs (BOQ review, quotation comparison, approved-vendor
  dashboard). Treat as the working spec for the Power App version.

## Quick start (web app)

Requirements: Node.js 18+ and npm 9+.

```bash
cd web-app
npm install --workspaces --include-workspace-root
npm run dev
```

This starts:
- API server on http://localhost:4000 (SQLite database at `web-app/server/data/sop.db`)
- React client on http://localhost:5173

For a single-port production build:

```bash
npm run build      # builds the React client
npm start          # API serves the built client at http://localhost:4000
```

## Modules

| Module | Where in the app | Purpose |
|---|---|---|
| BOQ Budget Review | Projects → open project → BOQ tab | Capture Bill of Quantities per project, compare budgeted vs awarded, see variance |
| Vendor Quotation Comparison | Projects → open project → Quotations tab | Capture quotations per BOQ line, compare against budget and lowest bidder, award |
| Approved Vendor Dashboard | Dashboard, Vendors, Approved Vendor Matrix | Cross-project view of approved vendors, contract values and category spend |

## Data model

- **projects** — project register (code, client, budget, status)
- **vendors** — vendor master with approval workflow
- **boq_items** — BOQ line items per project, with budgeted and awarded amounts
- **quotations** — quotes from vendors against BOQ items
- **project_vendors** — derived register of awarded vendor↔project links

Awarding a quotation automatically updates the BOQ line and project_vendors register.
