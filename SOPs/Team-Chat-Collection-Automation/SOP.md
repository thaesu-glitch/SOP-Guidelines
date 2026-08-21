# SOP: Auto-Capture Collection Updates from Teams Group Chat into Excel Tracker

**Process owner:** Finance / Collections
**Scope:** Automatically logs student fee collection updates posted in a Microsoft Teams group chat into the shared Excel tracker, including a link to the bank slip proof.
**Tool:** Microsoft Power Automate — Microsoft Teams + Excel Online (Business) connectors only, both standard (no premium licence needed).

## Files in this folder

| File | Purpose |
|---|---|
| `Collection-Tracker-Template.xlsx` | The Excel tracker. Contains the `CollectionsTable` table the flow appends rows to. |
| `Collections-Chat-to-Excel-Flow.zip` | Importable Power Automate package — builds the whole flow in one step (§4). |
| `flow-definition.json` | The same flow logic in readable form, for review or manual rebuild. |

---

## 1. Required message format

Power Automate cannot reliably read free-text chat ("paid 500 for John today, slip attached"). Everyone posting a collection update must use this template, and must **attach the bank slip as a file**.

```
COLLECTION
Student Name: Jane Doe
Student Grade: Grade 5
Amount: 500
Exchange Rate: 1.35
Collection Channel: Bank Transfer
Date Of Collection: 2026-08-21
```

Then attach the bank slip via the Teams **paperclip icon → Upload from this device**, in the *same* message.

Rules to communicate to the team:
- Keep the labels **exactly** as written, including capitalisation and the colon.
- `Amount` and `Exchange Rate` must be plain numbers — `500` not `$500` or `500 USD`. The flow rejects the message if these can't be read as numbers, and posts a warning back into the chat.
- Use `yyyy-mm-dd` for the date.
- Any message that doesn't contain both `COLLECTION` and `Student Name:` is ignored, so normal chat conversation is unaffected.

**Why attach as a file, not paste a screenshot:** a pasted inline image is stored as Teams "hosted content", which needs a Graph API app registration and (in most tenants) a premium licence to retrieve. A file attached with the paperclip lands in the sender's OneDrive and Teams exposes a ready-to-use `contentUrl` on the message, which the standard connector reads for free.

---

## 2. Prerequisites

1. **Excel tracker in a shared cloud location.** Upload `Collection-Tracker-Template.xlsx` to a SharePoint document library or OneDrive for Business folder Finance can reach. The Excel Online connector cannot use a local or desktop-synced-only file.
2. **Delete the example row** (row 2, grey italic) before go-live. It exists only to show the expected format.
3. **Flow owner account.** The flow runs under one person's Microsoft 365 sign-in. That person must be a member of the collections group chat *and* have edit access to the Excel file.
4. Confirm standard Power Automate access (included in most Microsoft 365 business plans).

---

## 3. Collect three values before you start

You will need these to finish either build path. Get them now.

| Value | Where to find it |
|---|---|
| **Chat ID** | In Teams, open the group chat → **⋯ → Copy link**. The link contains `19:...@thread.v2` — that whole string is the chat ID. |
| **Excel file location** | The SharePoint site or OneDrive folder holding the tracker. You'll pick this from a dropdown, so just know where it is. |
| **Table name** | `CollectionsTable` — already set in the template, no need to change it. |

---

## 4. Build path A — import the package (recommended)

1. Go to **make.powerautomate.com** → sign in as the flow owner.
2. Left nav → **My flows** → **Import** → **Import Package (Legacy)**.
3. Upload `Collections-Chat-to-Excel-Flow.zip`.
4. On the review screen, each listed item needs an action:
   - The **flow** itself → *Create as new*.
   - **Microsoft Teams** → select an existing connection, or **Create new** and sign in.
   - **Excel Online (Business)** → same.
5. Click **Import**. The flow is created but **switched off** and still has placeholders.
6. Open the flow → **Edit**, and replace every placeholder value:

   | Where | Placeholder | Replace with |
   |---|---|---|
   | Trigger *When a new chat message is added* | `REPLACE_WITH_CHAT_ID` | your group chat (pick from the dropdown — don't paste the ID if a dropdown appears) |
   | *Add a row into a table* → Location | `REPLACE_WITH_SITE_OR_ME` | the SharePoint site, or *OneDrive for Business* |
   | *Add a row into a table* → Document Library | `REPLACE_WITH_DRIVE_ID` | the library holding the tracker |
   | *Add a row into a table* → File | `REPLACE_WITH_FILE_ID` | `Collection-Tracker-Template.xlsx` |
   | Both *Post message* actions → Group chat | `REPLACE_WITH_CHAT_ID` | the same group chat |

   The Table field should already read `CollectionsTable`; if it shows as a text box rather than a dropdown, re-pick it from the dropdown after the file is set so the column mapping binds correctly.
7. **Save**, then **turn the flow on**.
8. Run the tests in §6 before telling the team to use it.

> If the import is rejected, don't fight it — go to build path B. Package import formats change between Power Automate releases, and this package was assembled by hand rather than exported from a live tenant, so the wrapper may not match your tenant's current importer. The flow logic in §5 is the same either way and is the part that was actually verified.

---

## 5. Build path B — build it manually

**+ Create → Automated cloud flow.** Search the trigger **"When a new chat message is added"** (Microsoft Teams). Set **Message type** to *Group chat* and pick the chat.

Then add these actions in order. For each **Compose**, rename it exactly as shown — the later expressions refer to these names.

**1. Compose → `Get_message_body`**
```
triggerBody()?['body']?['content']
```

**2. Compose → `Normalize_text`** — converts Teams' HTML line breaks into real newlines:
```
replace(replace(replace(replace(replace(replace(replace(replace(outputs('Get_message_body'), '<br>', decodeUriComponent('%0A')), '<br/>', decodeUriComponent('%0A')), '<br />', decodeUriComponent('%0A')), '</div>', decodeUriComponent('%0A')), '</p>', decodeUriComponent('%0A')), '</span>', decodeUriComponent('%0A')), '&nbsp;', ' '), '&amp;', '&')
```
> Copy this from `flow-definition.json` (the `Normalize_text` action) rather than retyping — the bracket nesting is easy to break.

**3. Condition → `Is_collection_message`**
- `outputs('Normalize_text')` **contains** `COLLECTION`
- **AND** `outputs('Normalize_text')` **contains** `Student Name:`

Everything below goes in the **If yes** branch. The No branch stays empty, so ordinary chat ends the run harmlessly.

**4. Six Compose actions, one per field.** Each uses the same shape: cut the text at the *next* label, take what follows *this* label, drop anything from the first `<` onward, trim. For **`Student_name`**:
```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:'))))
```
Build the other five by substituting the label pair:

| Compose name | This label | Next label |
|---|---|---|
| `Student_name` | `Student Name:` | `Student Grade:` |
| `Student_grade` | `Student Grade:` | `Amount:` |
| `Amount_text` | `Amount:` | `Exchange Rate:` |
| `Exchange_rate_text` | `Exchange Rate:` | `Collection Channel:` |
| `Collection_channel` | `Collection Channel:` | `Date Of Collection:` |
| `Date_of_collection` | `Date Of Collection:` | *(none — see below)* |

`Date_of_collection` has no following label, so it drops the inner `first(split(...))`:
```
trim(if(contains(last(split(outputs('Normalize_text'), 'Date Of Collection:')), '<'), first(split(last(split(outputs('Normalize_text'), 'Date Of Collection:')), '<')), last(split(outputs('Normalize_text'), 'Date Of Collection:'))))
```

All six are written out verbatim in `flow-definition.json` — copy from there.

**5. Compose → `Bank_slip_link`**
```
if(greater(length(coalesce(triggerBody()?['attachments'], json('[]'))), 0), coalesce(first(triggerBody()?['attachments'])?['contentUrl'], 'MISSING - attachment had no link'), 'MISSING - no file attached, follow up with sender')
```

**6. Condition → `Numbers_are_valid`**
- `isFloat(outputs('Amount_text'))` **is equal to** `true`
- **AND** `isFloat(outputs('Exchange_rate_text'))` **is equal to** `true`

**If yes → Excel Online (Business) → Add a row into a table.** Point it at the tracker, table `CollectionsTable`, and map:

| Column | Value |
|---|---|
| Student Name | `outputs('Student_name')` |
| Student Grade | `outputs('Student_grade')` |
| Amount | `float(outputs('Amount_text'))` |
| Exchange Rate | `float(outputs('Exchange_rate_text'))` |
| Collection Channel | `outputs('Collection_channel')` |
| Date Of Collection | `outputs('Date_of_collection')` |
| Bank Slip Screenshot Link | `outputs('Bank_slip_link')` |

`float()` matters — without it Excel stores the amounts as text and they won't sum.

**Then → Teams → Post message in a chat or channel**, to the same chat:
```
Logged to tracker: @{outputs('Student_name')} (@{outputs('Student_grade')}) - @{outputs('Amount_text')} via @{outputs('Collection_channel')} on @{outputs('Date_of_collection')}
```

**If no → Teams → Post message in a chat or channel**, to the same chat:
```
NOT logged - could not read Amount / Exchange Rate as numbers. Amount read as '@{outputs('Amount_text')}', Exchange Rate read as '@{outputs('Exchange_rate_text')}'. Please repost using the COLLECTION template.
```

These confirmations can't cause a loop: neither contains `COLLECTION` *and* `Student Name:`, so a re-trigger on the bot's own message exits at step 3.

**Save**, then turn the flow on.

---

## 6. Test before rollout

Run all five. Check each result in the flow's **Run history** (28-day retention) and in the Excel file.

| # | Test | Expected |
|---|---|---|
| 1 | Post the §1 template correctly, with a file attached | New row, all 7 fields correct, link opens the slip. Confirmation posted in chat. |
| 2 | Post a casual message ("any update on fees?") | Flow either doesn't run or ends at the condition. No row, no chat reply. |
| 3 | Post the template with `Amount: five hundred` | No row. Warning posted in chat naming what it read. |
| 4 | Post the template with **no** attachment | Row created; link column reads `MISSING - no file attached, follow up with sender`. |
| 5 | Check Amount and Exchange Rate in Excel | Right-aligned / summable, i.e. stored as numbers not text. |

Delete the test rows when done.

---

## 7. Known limitations

- **Label-typo sensitivity.** A mistyped label (`Student:` instead of `Student Name:`) means that field extracts as an empty string, or as a chunk of the wrong text. Tests 1 and 3 catch the numeric fields; the name/grade/channel fields have no such guard. Spot-check the tracker weekly for the first month.
- **One chat per flow.** The trigger watches the single chat selected. For a second chat, copy the flow (**Save As**) and change the trigger and both Post-message actions. Better: consolidate reporting into one chat.
- **Owner dependency.** If the flow owner leaves the chat, loses file access, or their password changes, the flow silently stops. Assign someone to check Run history is green weekly, and consider adding a co-owner.
- **Attachment permissions.** The bank slip link points at the *sender's* OneDrive. Anyone opening it later needs access — if the sender leaves the organisation, the link can break. For a durable audit trail, add a **OneDrive/SharePoint → Copy file** step that puts the slip in a Finance-owned library and log that link instead.
- **Date is stored as typed.** The flow doesn't parse or validate the date; `2026-13-45` would be written as-is. Add a `Numbers_are_valid`-style check if this matters.
- **Retention.** Power Automate keeps run history 28 days. The Excel row is the permanent record, not the flow history.

---

## 8. What has and hasn't been verified

Honest status, so nobody assumes more than was actually tested:

- **Verified by simulation:** the text-extraction and guard logic in §5. Every expression was replicated exactly and run against the four HTML wrappers Teams is known to emit for a typed multi-line message (`<br>`-separated inside `<p>`, one `<div>` per line, plain newlines, and `<div>`+`<span>` nesting). All four return the correct seven values; a casual message is correctly ignored.
- **Not verified:** the flow has never been imported or executed in a live tenant, because building it required Power Automate write access that wasn't available. Specifically unconfirmed: that the `.zip` matches your tenant's current importer, and that the connector operation IDs (`OnNewChatMessage`, `AddRowV2`, `PostMessageToConversation`) match your connector versions. If any of these mismatch, path B sidesteps all of them — the designer picks the operation IDs for you.
- **Therefore:** treat §6 as mandatory, not optional.
