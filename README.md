# SOP-Guidelines

Finance and internal-control SOPs for Asia Strategic, plus the supporting
operational tooling.

## Contents

- [`docs/`](./docs) — Standard Operating Procedures (markdown)
  - `SOP_BOQ_Budget_Review.md`
  - `SOP_Vendor_Quotation_Comparison.md`
  - `SOP_Approved_Vendor_Management.md`
- [`web-app/`](./web-app) — operational tool implementing the SOPs:
  BOQ budget review, vendor quotation comparison, and an approved-vendor
  dashboard across projects.

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
