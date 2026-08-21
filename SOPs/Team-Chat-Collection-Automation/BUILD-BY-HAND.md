# Build the flow by hand — copy/paste sheet

Use this when the package import fails. Every expression below is the
exact string to paste into the designer's expression box, in the order
you will need it. Nothing here requires judgement — paste in sequence.

Values already known (no lookup needed):

| Setting | Value |
|---|---|
| Group chat | *Finance & YA Ambassadors and Admissions* |
| SharePoint site | `https://msholdings.sharepoint.com/sites/YangonAmericanProjects-Finance` |
| Library | `Shared Documents` (folder `Finance`) |
| Table | `CollectionsTable` |

---

## Step 0 — Upload the tracker first

The Excel step in Step 7 needs the file to already exist, so do this before opening Power Automate.

1. Open `https://msholdings.sharepoint.com/sites/YangonAmericanProjects-Finance` → **Documents** → the **Finance** folder.
2. Upload `Collection-Tracker-Template.xlsx`.
3. Open it and **delete row 2** — the grey italic example row. It exists only to show the expected format, and if left in place it will look like a real collection.

## Step 1 — Trigger

**+ Create → Automated cloud flow.** Trigger: **When a new chat message is added** (Microsoft Teams).

- **Message type**: `Group chat`
- **Group chat**: *Finance & YA Ambassadors and Admissions*

## Step 2 — Compose, renamed `Get_message_body`

```
triggerBody()?['body']?['content']
```

## Step 3 — Compose, renamed `Normalize_text`

```
replace(replace(replace(replace(replace(replace(replace(replace(outputs('Get_message_body'), '<br>', decodeUriComponent('%0A')), '<br/>', decodeUriComponent('%0A')), '<br />', decodeUriComponent('%0A')), '</div>', decodeUriComponent('%0A')), '</p>', decodeUriComponent('%0A')), '</span>', decodeUriComponent('%0A')), '&nbsp;', ' '), '&amp;', '&')
```

## Step 4 — Condition, renamed `Is_collection_message`

Two rows, joined with **And**:

| Left | Operator | Right |
|---|---|---|
| `outputs('Normalize_text')` | contains | `COLLECTION` |
| `outputs('Normalize_text')` | contains | `Student Name:` |

Everything from here goes in the **If yes** branch. Leave **If no** empty.

## Step 5 — Six Compose actions

Add six Compose actions inside **If yes**, renaming each one exactly as the heading says.

### `Student_name`  →  column *Student Name*

```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Student Grade:')), 'Student Name:'))))
```

### `Student_grade`  →  column *Student Grade*

```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Amount:')), 'Student Grade:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Amount:')), 'Student Grade:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Amount:')), 'Student Grade:'))))
```

### `Amount_text`  →  column *Amount*

```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Exchange Rate:')), 'Amount:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Exchange Rate:')), 'Amount:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Exchange Rate:')), 'Amount:'))))
```

### `Exchange_rate_text`  →  column *Exchange Rate*

```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Collection Channel:')), 'Exchange Rate:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Collection Channel:')), 'Exchange Rate:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Collection Channel:')), 'Exchange Rate:'))))
```

### `Collection_channel`  →  column *Collection Channel*

```
trim(if(contains(last(split(first(split(outputs('Normalize_text'), 'Date Of Collection:')), 'Collection Channel:')), '<'), first(split(last(split(first(split(outputs('Normalize_text'), 'Date Of Collection:')), 'Collection Channel:')), '<')), last(split(first(split(outputs('Normalize_text'), 'Date Of Collection:')), 'Collection Channel:'))))
```

### `Date_of_collection`  →  column *Date Of Collection*

```
trim(if(contains(last(split(outputs('Normalize_text'), 'Date Of Collection:')), '<'), first(split(last(split(outputs('Normalize_text'), 'Date Of Collection:')), '<')), last(split(outputs('Normalize_text'), 'Date Of Collection:'))))
```

## Step 6 — Compose, renamed `Bank_slip_link`

```
if(greater(length(coalesce(triggerBody()?['attachments'], json('[]'))), 0), coalesce(first(triggerBody()?['attachments'])?['contentUrl'], 'MISSING - attachment had no link'), 'MISSING - no file attached, follow up with sender')
```

## Step 7 — Condition, renamed `Numbers_are_valid`

Two rows, joined with **And**:

| Left | Operator | Right |
|---|---|---|
| `isFloat(outputs('Amount_text'))` | is equal to | `true` |
| `isFloat(outputs('Exchange_rate_text'))` | is equal to | `true` |

### If yes → Excel Online (Business) → *Add a row into a table*

Location = the SharePoint site above · Document Library = `Shared Documents` ·
File = `Collection-Tracker-Template.xlsx` · Table = `CollectionsTable`

Then map the seven columns:

| Column | Expression to paste |
|---|---|
| Student Name | `outputs('Student_name')` |
| Student Grade | `outputs('Student_grade')` |
| Amount | `float(outputs('Amount_text'))` |
| Exchange Rate | `float(outputs('Exchange_rate_text'))` |
| Collection Channel | `outputs('Collection_channel')` |
| Date Of Collection | `outputs('Date_of_collection')` |
| Bank Slip Screenshot Link | `outputs('Bank_slip_link')` |

### If yes, after the Excel step → Teams → *Post message in a chat or channel*

Post to the same group chat. Message:

```
Logged to tracker: @{outputs('Student_name')} (@{outputs('Student_grade')}) - @{outputs('Amount_text')} via @{outputs('Collection_channel')} on @{outputs('Date_of_collection')}
```

### If no → Teams → *Post message in a chat or channel*

Post to the same group chat. Message:

```
NOT logged - could not read Amount / Exchange Rate as numbers. Amount read as '@{outputs('Amount_text')}', Exchange Rate read as '@{outputs('Exchange_rate_text')}'. Please repost using the COLLECTION template.
```

## Step 8 — Save, turn on, then run the five tests in SOP §6

The two confirmation messages cannot cause a loop: neither contains both
`COLLECTION` and `Student Name:`, so a re-trigger on the bot's own message
exits at Step 4.
