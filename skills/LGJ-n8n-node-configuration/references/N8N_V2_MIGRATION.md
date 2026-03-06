# n8n v2 Migration Guide

Breaking changes and required adjustments when upgrading from n8n v1 to v2.

---

## Code Node .item Accessor (CRITICAL)

`$('NodeName').item.json` in **"Run Once for All Items" mode** Code nodes **silently hangs forever** — no output, no error.

**Replace with:**

```javascript
// JavaScript
$('NodeName').first().json    // single item
$input.all()[0].json          // first of batch
```

```python
# Python
_input.first()["json"]       # single item
_input.all()[0]["json"]       # first of batch
```

**Scope**: Only affects Code nodes. Expression fields using `.item.json` still work fine.

---

## Agent Node Think Tool Schema (CRITICAL)

Agent node typeVersion ≤ 2.2 auto-injects a Think tool with a malformed `input_schema` (missing `"type": "object"`). Both Anthropic and OpenAI APIs reject this.

**Fix**: Upgrade Agent node `typeVersion` to **3**. No parameter changes required.

---

## executeCommand Node Disabled

The `executeCommand` node is disabled by default in n8n v2 for security reasons.

**Replace with**: SSH nodes (`n8n-nodes-base.ssh`) connecting to the target server, or use Code nodes with built-in functions.

---

## Node.js Version Requirements

n8n v2.9.4+ requires **Node.js ≥ 22.16**. Verify before upgrading:

```bash
node --version  # Must be ≥ 22.16
```

---

## Pre-Upgrade Audit Checklist

Before upgrading to n8n v2, scan workflows for:

- [ ] **Code nodes using `.item.json`** in "Run Once for All Items" mode — replace with `.first().json` or `.all()[0].json`
- [ ] **Agent nodes at typeVersion ≤ 2.2** — upgrade to typeVersion 3
- [ ] **executeCommand nodes** — replace with SSH nodes
- [ ] **Node.js version** — ensure ≥ 22.16 on the server
- [ ] **External integrations** — verify API compatibility with new n8n version

---

## Related

- [NODE_GOTCHAS.md](NODE_GOTCHAS.md) — Node-specific configuration pitfalls
- [../SKILL.md](../SKILL.md) — Main node configuration guide
