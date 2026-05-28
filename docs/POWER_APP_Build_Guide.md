# Power App Build Guide — BOQ Budget, Vendor Quotation Comparison & Approved-Vendor Dashboard

**Target platform:** Dataverse + Model-driven Power App
**License needed:** Power Apps Per User plan (~USD 5/user/month) or Dynamics 365.
**Estimated build time:** 4–6 hours for a maker familiar with Power Apps Studio.

This guide rebuilds the same three modules as the web app in this repo:
**BOQ Budget Review · Vendor Quotation Comparison · Approved Vendor Dashboard.**

---

## 0. Before you start

1. Go to <https://make.powerapps.com> and select your environment.
2. Confirm you can see **Solutions** in the left nav. If not, you need a Power Apps Per User trial/licence.
3. Decide a publisher **prefix** (3–8 chars, e.g. `as` for Asia Strategic). All schema names below assume `as_`.

---

## 1. Create the solution

1. **Solutions → New solution**
2. Display name: `Asia Strategic — BOQ & Vendor Management`
3. Name: `AsiaStrategicBOQ`
4. Publisher: create new — Display name `Asia Strategic`, Prefix `as`, Choice value prefix `10000`.
5. Version: `1.0.0.0` → **Create**.

All tables, choices, flows and the app below must be created **inside this solution** so they can be exported/imported.

---

## 2. Create global Choice columns (option sets)

In the solution: **+ New → More → Choice**. Create these one at a time:

| Choice name (schema) | Values (label → value) |
|---|---|
| `as_projectstatus` | Planning → 1, In progress → 2, On hold → 3, Completed → 4 |
| `as_vendorstatus` | Pending → 1, Approved → 2, Blacklisted → 3 |
| `as_boqstatus` | Pending → 1, Under review → 2, Awarded → 3, Cancelled → 4 |
| `as_quotestatus` | Received → 1, Evaluated → 2, Selected → 3, Rejected → 4 |
| `as_availability` | Included → 1, Not included → 2, Optional → 3 |
| `as_materiallabour` | Material → 1, Labour → 2, Material + Labour → 3 |
| `as_currency` | MMK → 1, USD → 2, EUR → 3, THB → 4, SGD → 5 |

> **Tip:** uncheck *Sync this choice with the global choices in this solution* only if you want to make it environment-specific.

---

## 3. Create the tables

For each table below: **+ New → Table → Table (advanced properties)**. Set the schema name with the prefix (e.g. `as_project`). For the **Primary column**, set its display name to the value shown.

### 3.1 Project (`as_project`)

| Display name | Schema | Type | Required | Notes |
|---|---|---|---|---|
| Project code | `as_code` | Single line of text, 20 | Business required | Use Alternate Key for uniqueness |
| Project name | `as_name` | (primary) | Business required | |
| Client | `as_client` | Single line of text, 100 | | |
| Location | `as_location` | Single line of text, 100 | | |
| Start date | `as_startdate` | Date only | | |
| End date | `as_enddate` | Date only | | |
| Status | `as_status` | Choice → `as_projectstatus` | Business required | Default: Planning |
| Approved budget | `as_budgettotal` | Currency | | |
| Currency | `as_currency` | Choice → `as_currency` | Business required | Default: MMK |
| BOQ budgeted total | `as_boqbudgetedtotal` | **Rollup → Currency** | | See §6.1 |
| BOQ awarded total | `as_boqawardedtotal` | **Rollup → Currency** | | See §6.1 |
| Budget variance | `as_budgetvariance` | **Formula → Currency** | | `as_boqawardedtotal - as_boqbudgetedtotal` |
| Notes | `as_notes` | Multiline text, 2000 | | |

**Alternate key:** Tables → Project → Keys → New key → Display: *Project code*, columns: `as_code`.

### 3.2 Vendor (`as_vendor`)

| Display name | Schema | Type | Required | Notes |
|---|---|---|---|---|
| Vendor code | `as_vendorcode` | Single line of text, 20 | Business required | Alternate key |
| Vendor name | `as_name` | (primary) | Business required | |
| Category | `as_category` | Single line of text, 60 | | e.g. Fitout / MEP / IT |
| Contact person | `as_contactperson` | Single line of text, 100 | | |
| Email | `as_email` | Single line of text, format Email | | |
| Phone | `as_phone` | Single line of text, format Phone | | |
| Address | `as_address` | Multiline text, 500 | | |
| Registration no. | `as_registrationno` | Single line of text, 50 | | |
| Tax ID | `as_taxid` | Single line of text, 50 | | |
| Status | `as_status` | Choice → `as_vendorstatus` | Business required | Default: Pending |
| Approved date | `as_approveddate` | Date only | | |
| Approved by | `as_approvedby` | Lookup → User (`systemuser`) | | |
| Total contract value | `as_totalcontractvalue` | **Rollup → Currency** | | See §6.1 |
| Active project count | `as_activeprojectcount` | **Rollup → Whole number** | | See §6.1 |
| Notes | `as_notes` | Multiline text, 2000 | | |

### 3.3 BOQ Item (`as_boqitem`)

> The primary column should be **Item code** so the row shows nicely in lookups.

| Display name | Schema | Type | Required | Notes |
|---|---|---|---|---|
| Item code | `as_itemcode` | (primary) | Business required | e.g. `1010101-000` |
| Project | `as_project` | Lookup → `as_project` | Business required | |
| Tender code | `as_tendercode` | Single line of text, 30 | | |
| Lv1 code | `as_lv1code` | Single line of text, 10 | | |
| Lv1 name | `as_lv1name` | Single line of text, 80 | | e.g. CAPEX\|Construction |
| Lv2 code | `as_lv2code` | Single line of text, 10 | | |
| Lv2 name | `as_lv2name` | Single line of text, 80 | | Fitout / MEP / IT / Furniture / Firefighting / MKT |
| Lv3 code | `as_lv3code` | Single line of text, 10 | | |
| Lv3 name | `as_lv3name` | Single line of text, 80 | | Floor / Partition / Electricity / Lighting / etc. |
| Lv4 code | `as_lv4code` | Single line of text, 10 | | |
| Lv4 name | `as_lv4name` | Single line of text, 80 | | |
| Lv5 code | `as_lv5code` | Single line of text, 10 | | |
| Lv5 name | `as_lv5name` | Single line of text, 80 | | |
| Description | `as_description` | Multiline text, 1000 | Business required | |
| Room | `as_room` | Single line of text, 100 | | |
| Floor | `as_floor` | Single line of text, 30 | | |
| Width / Ø | `as_width` | Decimal (3) | | |
| Depth / Length | `as_depth` | Decimal (3) | | |
| Height | `as_height` | Decimal (3) | | |
| Thickness | `as_thickness` | Decimal (3) | | |
| Color | `as_color` | Single line of text, 60 | | |
| Color code | `as_colorcode` | Single line of text, 30 | | |
| Material | `as_material` | Single line of text, 100 | | |
| Material code | `as_materialcode` | Single line of text, 30 | | |
| Unit | `as_unit` | Single line of text, 20 | | sqm, lot, no., etc. |
| Availability | `as_availability` | Choice → `as_availability` | | Default: Included |
| Material/Labour | `as_materiallabour` | Choice → `as_materiallabour` | | Default: Material + Labour |
| Quantity | `as_quantity` | Decimal (4) | | |
| Historical price | `as_historicalprice` | Currency | | |
| Historical FX rate | `as_historicalfxrate` | Decimal (4) | | |
| Adjustment | `as_adjustment` | Currency | | |
| Budgeted unit rate | `as_budgetedunitrate` | Currency | | |
| Budgeted total | `as_budgetedtotal` | **Formula → Currency** | | `as_quantity * as_budgetedunitrate + IfError(as_adjustment, 0)` |
| Awarded unit rate | `as_awardedunitrate` | Currency | | Set by Award flow |
| Awarded total | `as_awardedtotal` | **Formula → Currency** | | `If(IsBlank(as_awardedunitrate), Blank(), as_quantity * as_awardedunitrate + IfError(as_adjustment, 0))` |
| Variance | `as_variance` | **Formula → Currency** | | `as_awardedtotal - as_budgetedtotal` |
| Awarded vendor | `as_awardedvendor` | Lookup → `as_vendor` | | Set by Award flow |
| Status | `as_status` | Choice → `as_boqstatus` | Business required | Default: Pending |
| Remarks | `as_remarks` | Multiline text, 2000 | | |

> **Formula column tip:** Use Power Fx, not the older "Calculated" type. Power Fx columns recalc instantly without manual refresh.

### 3.4 Quotation (`as_quotation`)

Primary column: **Quote reference** (auto-numbered).

| Display name | Schema | Type | Required | Notes |
|---|---|---|---|---|
| Quote reference | `as_quoteref` | (primary) | Auto-number | Format: `Q-{SEQNUM:00000}` |
| Project | `as_project` | Lookup → `as_project` | Business required | |
| BOQ item | `as_boqitem` | Lookup → `as_boqitem` | Business required | |
| Vendor | `as_vendor` | Lookup → `as_vendor` | Business required | |
| Primary unit price | `as_primaryunitprice` | Currency | | |
| Primary quantity | `as_primaryquantity` | Decimal (4) | | |
| Additional unit price | `as_additionalunitprice` | Currency | | |
| Additional quantity | `as_additionalquantity` | Decimal (4) | | |
| Material price | `as_materialprice` | Currency | | |
| Labour cost | `as_labourcost` | Currency | | |
| Quoted unit rate | `as_quotedunitrate` | **Formula → Currency** | | `If(as_materialprice + as_labourcost > 0, as_materialprice + as_labourcost, as_primaryunitprice + as_additionalunitprice)` |
| Quoted total | `as_quotedtotal` | **Formula → Currency** | | `as_quotedunitrate * Sum(as_boqitem.as_quantity)` — actually use a flow (see §7.4) since formula columns can't traverse lookups reliably |
| Override room | `as_ovroom` | Single line of text, 100 | | |
| Override floor | `as_ovfloor` | Single line of text, 30 | | |
| Override width | `as_ovwidth` | Decimal (3) | | |
| Override depth | `as_ovdepth` | Decimal (3) | | |
| Override height | `as_ovheight` | Decimal (3) | | |
| Override thickness | `as_ovthickness` | Decimal (3) | | |
| Override color | `as_ovcolor` | Single line of text, 60 | | |
| Override material | `as_ovmaterial` | Single line of text, 100 | | |
| Vendor's note | `as_vendornote` | Multiline text, 2000 | | |
| Quote date | `as_quotedate` | Date only | | |
| Validity date | `as_validitydate` | Date only | | |
| Payment terms | `as_paymentterms` | Single line of text, 200 | | |
| Delivery lead time | `as_deliveryleadtime` | Single line of text, 100 | | |
| Status | `as_status` | Choice → `as_quotestatus` | Business required | Default: Received |
| vs Budget | `as_vsbudget` | **Formula → Currency** | | `as_quotedtotal - Sum(as_boqitem.as_budgetedtotal)` — set via flow as note above |
| Remarks | `as_remarks` | Multiline text, 1000 | | |

> Because Dataverse formula columns can't sum across a parent lookup in all environments, **calculate `as_quotedtotal` and `as_vsbudget` in a Power Automate flow** that fires on quotation create/update (§7.4).

### 3.5 Project Vendor (`as_projectvendor`)

This is the cross-project register populated when a quotation is awarded.

Primary column: **Award reference** (auto-numbered, `AWD-{SEQNUM:00000}`).

| Display name | Schema | Type | Required | Notes |
|---|---|---|---|---|
| Award reference | `as_awardref` | (primary) | Auto-number | |
| Project | `as_project` | Lookup → `as_project` | Business required | |
| Vendor | `as_vendor` | Lookup → `as_vendor` | Business required | |
| Category | `as_category` | Single line of text, 60 | | |
| Contract value | `as_contractvalue` | Currency | | |
| Awarded date | `as_awardeddate` | Date only | | |
| Awarded by | `as_awardedby` | Lookup → User | | |
| Remarks | `as_remarks` | Multiline text, 1000 | | |

**Uniqueness:** add an **Alternate key** on (`as_project`, `as_vendor`, `as_category`) to prevent duplicates.

---

## 4. Relationships

Configure these in **Tables → [table] → Relationships → New**. The lookup columns above already create the basic 1:N — these are the **cascade behaviours and reverse navigations** to set:

| Parent | Child | Lookup column | Cascade Delete | Cascade Assign |
|---|---|---|---|---|
| `as_project` | `as_boqitem` | `as_project` | Cascade | Cascade |
| `as_project` | `as_quotation` | `as_project` | Cascade | Cascade |
| `as_project` | `as_projectvendor` | `as_project` | Cascade | Cascade |
| `as_vendor` | `as_quotation` | `as_vendor` | Restrict | None |
| `as_vendor` | `as_projectvendor` | `as_vendor` | Restrict | None |
| `as_boqitem` | `as_quotation` | `as_boqitem` | Cascade | Cascade |
| `as_vendor` | `as_boqitem` (awarded) | `as_awardedvendor` | Remove link | None |

Restrict on vendor means you can't delete a vendor with active contracts — that's intentional (see SOP — Approved Vendor Management §7).

---

## 5. Business rules (no-code validations)

Add these via **Tables → [table] → Business rules → New**:

### 5.1 Project
- **Active dates** — If `as_enddate` < `as_startdate`, show error "End date must be on or after start date" on `as_enddate`.

### 5.2 Vendor
- **Approval required fields** — If `as_status` = *Approved*, make `as_approveddate` and `as_approvedby` business required.

### 5.3 BOQ Item
- **Award integrity** — If `as_status` = *Awarded*, make `as_awardedvendor` and `as_awardedunitrate` business required.

### 5.4 Quotation
- **Vendor must be approved to be selected** — Server-side check via flow (§7.3); business rule cannot evaluate lookup-status from another table reliably.

---

## 6. Rollups (auto-aggregated columns)

Define these on the parent table; they recalculate hourly by default or on demand.

### 6.1 Project rollups
- **`as_boqbudgetedtotal`** = SUM of related `as_boqitem.as_budgetedtotal`
- **`as_boqawardedtotal`** = SUM of related `as_boqitem.as_awardedtotal` *FILTER* `as_status equals Awarded`
- *(optional)* **`as_boqitemcount`** = COUNT of related `as_boqitem`

### 6.2 Vendor rollups
- **`as_totalcontractvalue`** = SUM of related `as_projectvendor.as_contractvalue`
- **`as_activeprojectcount`** = COUNT DISTINCT of related `as_projectvendor` *FILTER* parent project `as_status` In (Planning, In progress)

> **Forced refresh:** open any row → bottom-right "Calculate" icon → triggers immediate recalc.

---

## 7. Power Automate flows (the workflow glue)

Create these in the same solution (**+ New → Automation → Cloud flow → Automated**).

### 7.1 Vendor approval stamp
- **Trigger:** When a row is modified — `as_vendor` — filter `as_status eq 2` (Approved) and `as_approveddate eq null`.
- **Actions:**
  1. Update row → set `as_approveddate` = `utcNow()`, `as_approvedby` = trigger user.

### 7.2 Award flow — "Award this quotation" button on Quotation form
- **Trigger:** Manual (button on form, "When a row is selected").
- **Steps:**
  1. **Get** the selected Quotation (with related BOQ Item, Vendor expanded).
  2. **Condition** — Vendor `as_status` = Approved. If false → terminate with error "Vendor must be approved before award".
  3. **List rows** — all other quotations on the same `as_boqitem`. For each → update `as_status` = Rejected.
  4. **Update** this quotation → `as_status` = Selected.
  5. **Update** BOQ item → `as_awardedvendor` = this vendor, `as_awardedunitrate` = `as_quotedunitrate`, `as_status` = Awarded.
  6. **Upsert** Project Vendor — match on (Project, Vendor, Category) — set `as_contractvalue` = `as_quotedtotal`, `as_awardeddate` = `utcNow()`, `as_awardedby` = trigger user.
  7. **Respond** with success message.

### 7.3 Quotation create — vendor approval check
- **Trigger:** When a row is added — `as_quotation`.
- **Action:** If parent vendor status ≠ Approved, post a Teams/email notification to procurement: "Quotation Q-xxxxx captured against non-approved vendor [name]. Onboarding required before award."

### 7.4 Quotation total recompute
- **Trigger:** When a row is added/modified — `as_quotation` — filter on `as_primaryunitprice OR as_additionalunitprice OR as_materialprice OR as_labourcost OR as_boqitem`.
- **Actions:**
  1. Get parent BOQ item.
  2. Compute `quotedTotal = (modifiedRow.quotedunitrate) * boqitem.as_quantity`.
  3. Compute `vsBudget = quotedTotal - boqitem.as_budgetedtotal`.
  4. Update the quotation with these values.
- **Guard against infinite trigger loop:** in the trigger filter, exclude updates whose only changes are `as_quotedtotal` or `as_vsbudget`.

### 7.5 Project budget guardrail (optional)
- **Trigger:** When `as_project.as_boqawardedtotal` changes.
- **Action:** If `as_boqawardedtotal` > 1.10 × `as_budgettotal`, send Approval to Finance Controller with the project record and require sign-off comment.

---

## 8. Views (saved queries)

Per table, **Views → + New view**. Recommended starting set:

### 8.1 Project views
- **Active projects** — filter `as_status` In (Planning, In progress); columns: Code, Name, Client, Status, Approved budget, BOQ budgeted, BOQ awarded, Variance.
- **My projects** — filter `Owner equals Current user`.
- **Completed projects** — filter `as_status` = Completed.

### 8.2 BOQ Item views
- **All BOQ items (this project)** — filter `as_project equals [Project lookup parameter]`.
- **Open BOQ items** — `as_status` ≠ Awarded.
- **Variance > 10%** — `as_variance / as_budgetedtotal > 0.1`.
- **By category** — group by `as_lv2name`.

### 8.3 Quotation views
- **Quotations for current BOQ item** — filter `as_boqitem equals [parameter]`; sort by `as_quotedtotal` ascending.
- **Selected quotations** — `as_status` = Selected.

### 8.4 Vendor views
- **Approved vendors** — `as_status` = Approved.
- **Pending vendors** — `as_status` = Pending.
- **Top vendors by contract value** — sort `as_totalcontractvalue` desc.

### 8.5 Project Vendor views
- **All awards** — sort `as_awardeddate` desc.
- **Awards by project** — group by `as_project`.

---

## 9. Forms

### 9.1 BOQ Item — main form (recommended tabs)

- **Tab: Summary**
  - Section "Identification": Item code, Tender code, Project, Status
  - Section "Classification": Lv1–Lv5 codes + names (two-column grid)
  - Section "Description": Description (full-width), Material, Color, Unit, Material/Labour
- **Tab: Quantity & budget**
  - Quantity, Historical price, Historical FX rate, Adjustment, Budgeted unit rate, Budgeted total
- **Tab: Specification**
  - Room, Floor, Width, Depth, Height, Thickness, Color code, Material code, Other type/value, Availability
- **Tab: Award**
  - Awarded vendor, Awarded unit rate, Awarded total, Variance — all read-only except Awarded vendor (cleared = revoke award)
- **Tab: Quotations** (Subgrid)
  - Subgrid of related Quotations; default view *Quotations for current BOQ item*

### 9.2 Quotation — main form

- **Tab: Summary**
  - BOQ item, Vendor, Status, Quote date, Validity date
- **Tab: Pricing**
  - Material price, Labour cost, Primary unit price, Primary quantity, Additional unit price, Additional quantity, Quoted unit rate, Quoted total, vs Budget
- **Tab: Vendor specs (overrides)**
  - All `as_ov*` columns
- **Tab: Commercial**
  - Payment terms, Delivery lead time, Remarks, Vendor's note
- **Ribbon button: "Award this quotation"** — invokes flow §7.2.

### 9.3 Project — main form

- **Tab: Summary**
  - Code, Name, Client, Location, Status, Currency, Start/End dates, Approved budget
- **Tab: Budget & variance**
  - BOQ budgeted total, BOQ awarded total, Budget variance (read-only)
  - **Sub-grid: BOQ items** (this project)
  - **Sub-grid: Awarded vendors** (`as_projectvendor` filtered by project)

### 9.4 Vendor — main form

- **Tab: Summary**
  - Code, Name, Category, Status, Approved date, Approved by
- **Tab: Contact**
  - Contact person, Email, Phone, Address, Registration no., Tax ID
- **Tab: Activity**
  - Total contract value (read-only), Active project count
  - **Sub-grid: Project awards** (`as_projectvendor` filtered by vendor)
  - **Sub-grid: Quotations** (this vendor)
- **Ribbon button: "Approve vendor"** — sets status to Approved, opens flow §7.1.

---

## 10. Charts and dashboards

Create charts on each table (Personal/System), then assemble into a dashboard.

### 10.1 Charts to create
| Chart | Table | Type | Series / Category |
|---|---|---|---|
| **Budget vs Awarded by Project** | Project | Bar (clustered) | Series: BOQ budgeted, BOQ awarded · Category: Project name |
| **Spend by Lv2 category** | BOQ Item | Donut | Series: SUM Awarded total · Category: Lv2 name |
| **Top vendors by contract** | Vendor | Bar (horizontal) | Series: Total contract value · Category: Name (Top 10) |
| **Quotation status mix** | Quotation | Stacked column | Series: Count of quote ref · Category: Status |
| **BOQ award progress** | BOQ Item | Funnel | Series: Count · Category: Status |

### 10.2 System dashboard "BOQ & Vendor Overview"
**+ New → Dashboard → 2-column overview**

| Layout | Component |
|---|---|
| Tile 1 (top-left) | Chart: Budget vs Awarded by Project |
| Tile 2 (top-right) | Chart: Spend by Lv2 category |
| Tile 3 (mid-left) | List view: Active projects |
| Tile 4 (mid-right) | Chart: Top vendors by contract |
| Tile 5 (bottom-left) | List view: BOQ items — Variance > 10% |
| Tile 6 (bottom-right) | Chart: Quotation status mix |

Set this dashboard as the **default landing page** of the model-driven app (§12.2).

---

## 11. Security roles

Create three custom security roles inside the solution: **+ New → Security → Security role**.

| Role | Project | Vendor | BOQ item | Quotation | Project Vendor |
|---|---|---|---|---|---|
| **BOQ Admin** | Create/Read/Write/Delete | Create/Read/Write/Delete | Full | Full | Full |
| **Procurement** | Read | Create/Read/Write (status: Pending), Read (Approved) | Read/Write | Create/Read/Write | Read |
| **Finance Controller** | Read/Write (`as_status`, `as_budgettotal`) | Read/Write (Approve action) | Read | Read | Read |
| **Project Manager** | Read (assigned projects) | Read | Create/Read/Write (own project) | Read | Read |
| **Viewer** | Read | Read | Read | Read | Read |

Assign roles to AAD security groups for easier management. Map roles to the SOPs:
- *BOQ Admin* → IT / Power Platform admin
- *Procurement* → SOP — Vendor Quotation Comparison §3
- *Finance Controller* → SOP — BOQ Budget Review §3, Approved Vendor §7

---

## 12. The model-driven app

### 12.1 Create the app
1. Solution → **+ New → App → Model-driven app**.
2. Name: `BOQ & Vendor Management`. Description: *BOQ budget review, vendor quotation comparison, approved vendor dashboard.*

### 12.2 Site map (navigation)
- **Area: Operations**
  - Group "Projects"
    - Subarea **Projects** → table `as_project`, default view: Active projects
    - Subarea **BOQ Items** → table `as_boqitem`, default view: Open BOQ items
  - Group "Vendors & Quotations"
    - Subarea **Vendors** → table `as_vendor`, default view: Approved vendors
    - Subarea **Quotations** → table `as_quotation`
    - Subarea **Awarded vendors** → table `as_projectvendor`
- **Area: Dashboards**
  - Subarea **Overview** → system dashboard *BOQ & Vendor Overview*

Set landing page = dashboard **Overview**.

### 12.3 Add tables and components
In the app designer:
- Add the five tables.
- For each table, add its main form and the views from §8.
- Add the dashboard and charts from §10.

**Save → Publish → Play.**

---

## 13. Bulk-load your existing BOQ data

You have the KU Mingalar workbook with 22 sheets. The cleanest path:

1. **Map sheets to one consolidated CSV.** Use the Power Query approach below in Excel:
   - In Excel, **Data → Get Data → From Other Sources → Blank Query → Advanced Editor**.
   - Paste this M code (adjust file path):
     ```m
     let
       file = Excel.Workbook(File.Contents("KU_Mingalar_BOQ.xlsx"), null, true),
       packages = {"Fee and Fitout", "Furniture", "MEP", "Firefighting", "MKT", "IT"},
       loadSheet = (name) =>
         let
           s = file{[Item=name, Kind="Sheet"]}[Data],
           promote = Table.PromoteHeaders(Table.Skip(s, 6), [PromoteAllScalars=true])
         in
           Table.AddColumn(promote, "Package", each name),
       all = Table.Combine(List.Transform(packages, loadSheet)),
       cleaned = Table.SelectRows(all, each [Combined] <> null and Text.Length(Text.From([Combined])) > 4)
     in
       cleaned
     ```
   - This concatenates all package sheets into one flat table.
2. **Add columns to map onto Dataverse schema:** Project (constant `KU-MDY-001`), Lv1 code/name, Lv2 code/name, Lv3 code/name, Description, Unit, Quantity, Budgeted unit rate, etc.
3. **Export to CSV.**
4. In Dataverse: **as_boqitem table → Import data → From CSV** — map columns to Dataverse schema names. Power Platform will offer to create unmapped rows.
5. Repeat for vendors (use the vendor master from columns AL-IM of the detail sheets).

> **Tip:** Use *Data Import Wizard* for ≤50k rows; for larger loads, use **Dataflows** or **Power Automate "Excel: List rows in a table"**.

---

## 14. Mobile use

Model-driven apps work on iOS/Android via the **Power Apps mobile app**. After publishing, users with the assigned security role will see the app on mobile. No additional build needed.

For an executive read-only dashboard on phones, you can additionally build a small **canvas app** that points at the same Dataverse tables and only renders the dashboard tiles — link to it from the model-driven app's nav.

---

## 15. Going further

- **Approvals** — wire Power Automate **Approvals** action into flow §7.5 (budget overrun) to route to Finance Controller via email/Teams.
- **Audit history** — turn on at table level for Project, BOQ Item, Quotation. Mandatory if these will be used in regulated reporting.
- **Document management** — enable SharePoint integration on Project so users can attach drawings/contracts under each project.
- **AI Builder** — use **Document automation** to OCR vendor quotation PDFs straight into Quotation rows (requires AI Builder credits).
- **Power BI** — connect Dataverse to a Power BI workspace for cross-project trend dashboards beyond what model-driven charts offer.

---

## Reference — file map

| Concept | This repo | Power App equivalent |
|---|---|---|
| `projects` table | `web-app/server/src/db.js` | `as_project` |
| `boq_items` table | same | `as_boqitem` |
| `quotations` table | same | `as_quotation` |
| `vendors` table | same | `as_vendor` |
| `project_vendors` table | same | `as_projectvendor` |
| Award action | `boq.js → /api/boq/:id/award` | Power Automate flow §7.2 |
| Dashboard endpoint | `dashboard.js → /api/dashboard/summary` | Charts §10.1 + dashboard §10.2 |
| Rollup totals | SQLite SUM queries | Rollup columns §6 |
| SOP documents | `docs/SOP_*.md` | Same (process is platform-agnostic) |
