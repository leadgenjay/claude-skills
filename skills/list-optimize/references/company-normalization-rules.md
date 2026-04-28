# Phase 2: Company Name Normalization Rules

Pure-bash deterministic rules. No API calls, no LLM. Applied by `scripts/list-optimize/normalize-company.sh`.

## Goal

Reduce variants like:
- `Acme Inc.`
- `Acme, LLC`
- `acme inc`
- `ACME INCORPORATED`
- `The Acme Company`

To one canonical form: `Acme`.

This makes duplicate detection reliable and gives copywriting a clean string to merge into spintax fallbacks.

## Rules (applied in order)

### 1. Trim & collapse whitespace
- Strip leading/trailing whitespace
- Collapse internal runs of whitespace to a single space

### 2. Strip surrounding punctuation
- Remove leading/trailing commas, periods, semicolons, parentheses

### 3. Strip leading article
- `^The ` (case-insensitive) -> ``
- Example: `The Acme Company` -> `Acme Company`

### 4. Strip trailing legal-form suffixes (case-insensitive)

Suffixes recognized (in order, longest first):
```
Incorporated
Corporation
Limited
Pty Ltd
GmbH
S.A.
S.r.l.
K.K.
L.L.C.
LLC
Corp
Inc.
Inc
Ltd.
Ltd
Co.
Co
Company
LLP
LP
PLLC
PC
PA
```

Strip these tokens AFTER an optional preceding comma. Examples:
- `Acme Inc.` -> `Acme`
- `Acme, LLC` -> `Acme`
- `Acme, Inc.` -> `Acme`
- `Acme Company` -> `Acme`
- `Smith & Sons, Co.` -> `Smith & Sons`

### 5. Strip trailing punctuation again
After suffix removal, trim any leftover trailing comma/period.

### 6. Title-case with acronym preservation

Lowercase the whole string, then title-case each space-separated token EXCEPT:
- Tokens of length ≤4 that were ALL UPPERCASE in the input -> preserve as-is
- Common acronyms always preserved: `IBM`, `NASA`, `IKEA`, `AT&T`, `H&R`, `B&H`, `CNN`, `BBC`, `NBC`, `CBS`, `ESPN`, `MIT`, `UCLA`, `USC`, `NYU`

Examples:
- `ACME` (input all caps, length 4) -> `ACME`
- `IBM Corp.` -> input `IBM`, length 3, all-caps -> preserve -> `IBM`
- `acme inc` -> input lowercase, after suffix strip -> `acme` -> title-case -> `Acme`
- `aT&T` -> known acronym -> `AT&T`
- `john smith consulting` -> `John Smith Consulting`

### 7. Collapse `&` and `and`

For DEDUP MATCHING ONLY, treat `&` and `and` as equivalent. The displayed `company_name_normalized` keeps the original form. Example:
- `Smith & Sons` and `Smith and Sons` both map to dedup key `smith and sons` but each row keeps its own `company_name_normalized` = `Smith & Sons` or `Smith and Sons` respectively.

### 8. Persist

```sql
UPDATE leads SET
  company_name_original = <raw value>,
  company_name_normalized = <canonical form>
WHERE id = <lead.id>;
```

`company_name_original` is set ONLY on the first normalization pass (preserves the very first scraped value across re-runs).

## Duplicate detection report

After the normalization pass, the script emits `scripts/campaigns/{campaign}/company-dupes.csv`:

```csv
normalized_name,lead_count,lead_ids,sample_emails
Acme,5,"123,456,789,1011,1213","sarah@acme.com,bob@acme.com,..."
Smith and Sons,3,"234,567,890","..."
```

Threshold: `lead_count >= 2`. Sorted by `lead_count` desc.

The script does NOT auto-merge. The user reviews the CSV and decides:
- Mark some leads `do_not_contact=1` (e.g., keep one per company per campaign)
- Manually merge via SQL if appropriate
- Ignore (leave duplicates if intentional, e.g., scraping multiple decision-makers per account)

## Edge cases

| Input | Output | Note |
|---|---|---|
| `""` (empty) | NULL | Don't normalize empty strings |
| `123 Main St LLC` | `123 Main St` | Address-style names: keep numerics, strip suffix |
| `Smith, Jones, & Doe` | `Smith, Jones, & Doe` | Don't strip internal commas (only trailing) |
| `Doctor's Office Inc` | `Doctor's Office` | Apostrophes preserved |
| Single token: `Apple` | `Apple` | No-op for already-canonical names |
| Diacritics: `Café Inc` | `Café` | UTF-8 preserved; title-case only ASCII |
| `Apple Inc Inc` (typo dup) | `Apple` | Strip suffix iteratively until no match |

## Implementation hint

Use bash arrays to hold the suffix list, iterate longest-first, use `sed -E` with case-insensitive flag (`I` on GNU, but BSD `sed` on macOS doesn't support `I` — use `tr` for lowercase comparisons or `awk`).

For macOS compatibility, prefer `awk` or `python3` for the title-case + acronym logic since BSD `sed` lacks features. The `db-query.sh` already uses `python3` so it's a safe dependency.
