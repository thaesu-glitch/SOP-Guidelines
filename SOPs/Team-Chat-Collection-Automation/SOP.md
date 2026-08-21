# SOP: Auto-Capture Collection Updates from Teams Group Chat into Excel Tracker

**Process owner:** Finance / Collections
**Scope:** Automatically logs student fee collection updates posted in a Microsoft Teams group chat into the shared Excel tracker (`Collection-Tracker-Template.xlsx`), including a link to the bank slip proof.
**Tool:** Microsoft Power Automate (no-code, standard connectors — no premium license required if the steps below are followed as written).

---

## 1. Why a message template is required

Power Automate cannot reliably read arbitrary free-text chat ("paid 500 for John today, slip attached"). To parse fields automatically, everyone posting a collection update must use one fixed template, and must **attach the bank slip as a file** (not a pasted/inline screenshot — see §2).

### Required message format

Every collection message must start with the keyword `COLLECTION` on its own line, followed by one labeled line per field, in this order:

```
COLLECTION
Student Name: Jane Doe
Student Grade: Grade 5
Amount: 500
Exchange Rate: 1.35
Collection Channel: Bank Transfer
Date Of Collection: 21/08/2026
```

Then attach the bank slip using the Teams **paperclip icon → Upload from this device** (not Ctrl+V paste) in the *same* message.

> Share this template with everyone posting in the collections group chat before turning the flow on. A message that doesn't start with `COLLECTION` is ignored by the flow, so normal chat conversation is unaffected.

**Why "attach as file" and not "paste screenshot":** a pasted/inline image is stored as Teams "hosted content," which requires a Graph API app registration and (in most tenants) a Premium Power Automate license to retrieve. A file attached via the paperclip is stored in the sender's OneDrive and Teams gives the message a normal, already-shareable `contentUrl` — the standard Teams connector exposes this for free. This SOP uses the file-attachment method throughout.

---

## 2. Prerequisites

1. **Excel tracker file**: Upload `Collection-Tracker-Template.xlsx` (in this folder) to a shared location — a SharePoint document library or a OneDrive for Business folder that Finance can access. Do not store it as a local desktop file; Power Automate's Excel Online connector requires OneDrive/SharePoint.
2. **Delete the example row** (row 2, greyed italic) from the table before go-live — keep it only as a format reference until then.
3. **Flow owner account**: the Power Automate flow runs under one person's Microsoft 365 sign-in (the "connection owner"). That person must already be a member of the Teams group chat where collections are posted, and must have edit access to the Excel file's SharePoint/OneDrive location.
4. Confirm your tenant has standard Power Automate access (included in most Microsoft 365 business plans) — this flow uses only the Microsoft Teams and Excel Online (Business) connectors, both non-premium.

---

## 3. Build the flow

Go to **make.powerautomate.com** → sign in as the flow owner → **+ Create** → **Automated cloud flow**.

### Step 1 — Trigger
- Skip "search connectors," instead choose **Skip** at the bottom, then build from blank, or search **"When a new chat message is added"** (Microsoft Teams connector, marked *preview*).
- In the trigger's settings, set **Chat message type** to *Group Chat* and pick the specific group chat from the list.
- Save.

### Step 2 — Normalize the message text
Add step → **Data Operation → Compose**. Name it `PlainText`. Set its input to:
```
triggerBody()?['body']?['content']
```
Add step → **Text Functions → HTML to text** (or another **Compose** using the `html2text` alternative if the plain "HTML to text" action isn't visible: some tenants list it under *Content Conversion*). This strips any `<div>`/`<br>` tags Teams may have added. Feed it `outputs('PlainText')`.

### Step 3 — Filter to collection messages only
Add step → **Condition**. Set:
```
startsWith(trim(outputs('Html_to_text')), 'COLLECTION')
```
equals `true`. Everything below goes in the **Yes** branch. (Casual chat messages fall into the No branch and the flow ends — nothing is written anywhere.)

### Step 4 — Split into lines
Inside the **Yes** branch, add **Data Operation → Split**:
- From: `outputs('Html_to_text')`
- With: `\n` (if lines don't split cleanly because Teams used `<div>` blocks instead of newlines, use `<br>` or `</div>` as the delimiter instead — check by testing with a real message first, see §5).

Name this action's output `Lines`.

### Step 5 — Extract each field
For **each of the six fields**, add a **Compose** action (name it after the field, e.g. `StudentName`) with this expression pattern — replace `Student Name:` with the exact label for that field each time:

```
trim(substring(
  first(filter(body('Split'), lambda: contains(item(), 'Student Name:'))),
  add(indexOf(first(filter(body('Split'), lambda: contains(item(), 'Student Name:'))), ':'), 1),
  sub(length(first(filter(body('Split'), lambda: contains(item(), 'Student Name:')))), add(indexOf(first(filter(body('Split'), lambda: contains(item(), 'Student Name:'))), ':'), 1))
))
```

> Power Automate's expression editor doesn't support `lambda` in `filter()` outside of newer "Filter array" v2 actions in some regions. If your tenant doesn't offer inline `filter()` with lambda, use the **Filter array** action instead (From: `Lines`, condition: `item` contains `Student Name:`), then a **Compose** that takes `first(body('Filter_array'))` and applies the same `substring`/`indexOf`/`trim` to strip the label. Repeat one Filter array + Compose pair per field — six pairs total (Date Of Collection is the 6th; the flow gets the bank slip link separately in Step 6, not from text).

Repeat for: `Student Grade:`, `Amount:`, `Exchange Rate:`, `Collection Channel:`, `Date Of Collection:`.

### Step 6 — Get the bank slip link
Add **Condition**: `length(triggerBody()?['attachments'])` is greater than `0`.
- **If yes**: add **Compose** named `BankSlipLink` = `first(triggerBody()?['attachments'])?['contentUrl']`.
- **If no**: add **Compose** named `BankSlipLink` = `'MISSING - follow up with sender'`.

### Step 7 — Write the row to Excel
Add **Excel Online (Business) → Add a row into a table**:
- **Location**: OneDrive for Business / SharePoint Site (wherever you stored the file)
- **Document Library** / **File**: browse to `Collection-Tracker-Template.xlsx`
- **Table**: `CollectionsTable`
- Map each column to the matching Compose output:
  | Excel column | Value |
  |---|---|
  | Student Name | `outputs('StudentName')` |
  | Student Grade | `outputs('StudentGrade')` |
  | Amount | `outputs('Amount')` |
  | Exchange Rate | `outputs('ExchangeRate')` |
  | Collection Channel | `outputs('CollectionChannel')` |
  | Date Of Collection | `outputs('DateOfCollection')` |
  | Bank Slip Screenshot Link | `outputs('BankSlipLink')` |

### Step 8 — (Optional) Confirm back to the chat
Add **Microsoft Teams → Post message in a chat or channel**: post to the same group chat, message: `✅ Logged: [Student Name] - [Amount] [Collection Channel]`. This is safe from re-triggering the flow in a loop, because the confirmation text doesn't start with `COLLECTION`, so Step 3's condition sends it straight to the No branch on its own re-trigger.

### Step 9 — Save and turn on
Name the flow (e.g. "Collections Chat → Excel Tracker") and **Save**. Turn it on if it isn't already.

---

## 4. Test before rollout

1. In the group chat, post a test message using the exact template in §1, with a test file attached.
2. Open the flow's **Run history** in Power Automate — confirm it ran and check each Compose action's output matches what you typed.
3. Open `Collection-Tracker-Template.xlsx` and confirm a new row appeared with all 7 fields correct and the link opens the test file.
4. Post an unrelated casual message (not starting with `COLLECTION`) and confirm no row is added.
5. Delete the test row from the Excel table once confirmed.

---

## 5. Known limitations

- **Format sensitivity**: if someone mistypes a label (e.g. "Student:" instead of "Student Name:") that field will come through blank. Consider adding a validation condition after Step 5 that flags a message to the finance lead if any Compose output is empty.
- **One group chat per flow**: this flow only watches the one chat selected in the trigger. If collections get reported in more than one chat, either duplicate the flow per chat (same steps, different trigger chat) or ask staff to consolidate into a single chat.
- **Connection owner dependency**: if the flow owner leaves the group chat or loses file access, the flow silently stops working — someone should periodically check Run history stays green.
- **No amount/date validation**: the flow does not check that Amount is numeric or Date is a valid date; garbage input still gets written to the row. Add a **Condition** using `isFloat(outputs('Amount'))` / a date-parse check before Step 7 if stricter validation is needed.
