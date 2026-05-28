import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  client TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  budget_total REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MMK',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  registration_no TEXT,
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_date TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS boq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  item_code TEXT,                       -- Combined code (e.g. 1010101-000)
  tender_code TEXT,
  lv1_code TEXT, lv1_name TEXT,         -- e.g. 1 | CAPEX|Construction
  lv2_code TEXT, lv2_name TEXT,         -- e.g. 01 | Preconstruction
  lv3_code TEXT, lv3_name TEXT,         -- e.g. 01 | Service fee
  lv4_code TEXT, lv4_name TEXT,         -- e.g. 01 | Management
  lv5_code TEXT, lv5_name TEXT,

  -- Location & specification
  room TEXT, floor TEXT,
  width REAL, depth REAL, height REAL, thickness REAL,
  other_type TEXT, other_value TEXT,
  color TEXT, color_code TEXT,
  material TEXT, material_code TEXT,
  description TEXT NOT NULL,

  -- BOQ calculation
  unit TEXT,
  availability TEXT,                    -- Included / Not included
  material_labour TEXT,                 -- M / L / M+L
  quantity REAL NOT NULL DEFAULT 0,
  historical_price REAL,
  historical_fx_rate REAL,
  adjustment REAL NOT NULL DEFAULT 0,
  budgeted_unit_rate REAL NOT NULL DEFAULT 0,
  budgeted_total REAL NOT NULL DEFAULT 0,

  -- Award outcome
  awarded_unit_rate REAL,
  awarded_total REAL,
  awarded_vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  remarks TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_boq_project ON boq_items(project_id);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  boq_item_id INTEGER NOT NULL REFERENCES boq_items(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Pricing
  primary_unit_price REAL NOT NULL DEFAULT 0,
  primary_quantity REAL NOT NULL DEFAULT 0,
  additional_unit_price REAL NOT NULL DEFAULT 0,
  additional_quantity REAL NOT NULL DEFAULT 0,
  material_price REAL NOT NULL DEFAULT 0,
  labor_cost REAL NOT NULL DEFAULT 0,
  quoted_unit_rate REAL NOT NULL DEFAULT 0,    -- total unit price (mat + lab)
  quoted_total REAL NOT NULL DEFAULT 0,        -- total amount

  -- Per-vendor spec overrides
  ov_room TEXT, ov_floor TEXT,
  ov_width REAL, ov_depth REAL, ov_height REAL, ov_thickness REAL,
  ov_color TEXT, ov_material TEXT,
  vendor_note TEXT,

  -- Logistics
  quote_date TEXT,
  validity_date TEXT,
  payment_terms TEXT,
  delivery_lead_time TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quote_item ON quotations(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_project ON quotations(project_id);

CREATE TABLE IF NOT EXISTS project_vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category TEXT,
  contract_value REAL NOT NULL DEFAULT 0,
  awarded_date TEXT,
  awarded_by TEXT,
  remarks TEXT,
  UNIQUE(project_id, vendor_id, category)
);
CREATE INDEX IF NOT EXISTS idx_pv_project ON project_vendors(project_id);
CREATE INDEX IF NOT EXISTS idx_pv_vendor ON project_vendors(vendor_id);
`);

export default db;
