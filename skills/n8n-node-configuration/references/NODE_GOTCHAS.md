# Node Configuration Gotchas

Common node-specific configuration pitfalls and their solutions.

---

## Data Table Node — ResourceLocator & ResourceMapper

Data Table nodes require special parameter structures. Missing metadata properties causes a "?" error icon in the n8n UI.

### dataTableId (resourceLocator)

Must include `__rl: true`:

```javascript
// ❌ WRONG — missing __rl property
"dataTableId": {
  "mode": "name",
  "value": "My Table"
}

// ✅ CORRECT
"dataTableId": {
  "__rl": true,
  "mode": "name",
  "value": "My Table"
}
```

### columns (resourceMapper)

For update/insert/upsert operations, must include `schema` array with field definitions:

```javascript
// ❌ WRONG — missing schema array
"columns": {
  "mappingMode": "defineBelow",
  "value": {
    "my_column": "={{ $json.value }}"
  }
}

// ✅ CORRECT
"columns": {
  "mappingMode": "defineBelow",
  "value": {
    "my_column": "={{ $json.value }}"
  },
  "matchingColumns": [],
  "schema": [
    {
      "id": "my_column",
      "displayName": "my_column",
      "required": false,
      "defaultMatch": false,
      "canBeUsedToMatch": true,
      "display": true,
      "type": "string",
      "readOnly": false,
      "removed": false
    }
  ]
}
```

---

## Google Sheets Node — ResourceLocator Format

Google Sheets `documentId` and `sheetName` also require `__rl: true`:

```javascript
"documentId": {
  "__rl": true,
  "mode": "url",
  "value": "https://docs.google.com/spreadsheets/d/SHEET_ID/edit"
},
"sheetName": {
  "__rl": true,
  "mode": "name",
  "value": "Sheet1"
}
```

---

## PostgreSQL Node — Array Parameters

### JavaScript Arrays vs PostgreSQL Arrays

n8n passes JavaScript arrays as JSON `["a","b"]`, not PostgreSQL format `{a,b}`:

```javascript
// ❌ WRONG — UNNEST expects PostgreSQL array format
"query": "SELECT UNNEST($1::text[])"

// ✅ CORRECT — use json_to_recordset for JSON arrays
"query": "SELECT * FROM json_to_recordset($1::json) AS t(col text)"
```

### queryReplacement — 9+ Parameters Bug

n8n's `queryReplacement` cannot reliably parse 9+ comma-separated parameters. Errors include:
- `"there is no parameter $9"`
- `"invalid input syntax for type numeric: [string value]"`

```javascript
// ❌ WRONG — queryReplacement with many parameters
"query": "INSERT INTO t (a,b,c,d,e,f,g,h,i) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)"
"queryReplacement": "={{ $json.a }}, {{ $json.b }}, ..."  // BREAKS!

// ✅ CORRECT — inline SQL with expressions, leave queryReplacement EMPTY
"query": "INSERT INTO t (a, b, c) VALUES (
  {{ $json.id }},
  {{ $json.name ? \"'\" + $json.name.replace(/'/g, \"''\") + \"'\" : 'NULL' }},
  {{ $json.value }}
)"
```

For strings: use ternary with proper SQL escaping: `{{ $json.field ? "'" + $json.field.replace(/'/g, "''") + "'" : 'NULL' }}`

---

## Related

- [../SKILL.md](../SKILL.md) — Main node configuration guide
- [N8N_V2_MIGRATION.md](N8N_V2_MIGRATION.md) — n8n v2 breaking changes
