# Invoice & Payment App

A small internal app to create invoices, record payments received against them
(bank transfer, cash, cheque, etc.), and auto-generate invoice and payment
reports. Each user has their own login, and only sees their own clients,
invoices, and payments.

## Stack

- **Server**: Node.js + Express + SQLite (`better-sqlite3`), JWT auth, PDF
  generation with `pdfkit`. Lives in `server/`.
- **Client**: React + Vite. Lives in `client/`.

Payments are recorded manually (this app does not process live card
payments) — you log the amount, date, and method once you've received a
payment outside the app.

## Running locally

Open two terminals.

**1. Start the API server** (defaults to port 4000):

```bash
cd server
npm install
npm start
```

On first run it generates a random JWT signing secret and saves it to
`server/.jwt-secret` (gitignored) — don't commit that file. Data is stored in
`server/data.sqlite` (also gitignored).

**2. Start the frontend** (defaults to port 5173, proxies `/api` to the
server):

```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173, sign up for an account, and start creating
clients and invoices.

## What it does

- **Auth**: sign up / log in, each account's data is isolated.
- **Clients**: add/edit/delete the people or companies you invoice.
- **Invoices**: create invoices with multiple line items, tax rate, issue
  and due dates. Invoice numbers auto-increment per year
  (`INV-2026-0001`, ...). Download/view any invoice as a PDF.
- **Payments**: record one or more payments against an invoice (partial
  payments supported). Invoice status (`Unpaid` / `Partially Paid` /
  `Overdue` / `Paid`) is computed automatically from the amount paid and due
  date — you never set it by hand.
- **Reports**: a dashboard summary (total invoiced, collected, outstanding,
  overdue), plus filterable invoice and payment reports with CSV export.

## Environment variables (optional)

- `PORT` — API server port (default `4000`).
- `JWT_SECRET` — set this in production instead of relying on the
  auto-generated file, especially if you run multiple server instances.
- `DB_PATH` — path to the SQLite file (default `server/data.sqlite`).
