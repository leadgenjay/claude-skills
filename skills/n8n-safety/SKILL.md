---
name: n8n-safety
description: Enforces safety protocols for n8n workflow modifications. Automatically activated for any workflow create/update/delete operations.
---

# N8N Safety Guardrails

## Mandatory Confirmation Protocol

### Before ANY Modification Operation
You MUST confirm with the user:

1. **Instance Confirmation**
   ```
   Please confirm the target instance:
   - [ ] server.leadgenjay.com (leadgenjay)
   - [ ] server.nextwave.io (nextwave)
   ```

2. **Workflow Identification**
   ```
   Please confirm the workflow:
   - Workflow ID: {id}
   - Workflow Name: {name}
   - Current Status: {active/inactive}
   ```

3. **Operation Confirmation**
   ```
   I will perform the following operation:
   - Action: {create/update/delete/activate/deactivate}
   - Changes: {description of changes}

   Type 'CONFIRM' to proceed or describe any modifications.
   ```

## Pre-Operation Checklist

### For Updates
- [ ] Fetched current workflow state
- [ ] Identified specific nodes to modify
- [ ] User explicitly named this workflow in current conversation
- [ ] Changes are clearly defined
- [ ] Backup recommended for complex changes

### For Deletions
- [ ] User explicitly requested deletion
- [ ] Workflow ID confirmed
- [ ] Warned about irreversibility
- [ ] Suggested export backup first

### For Activations
- [ ] Workflow validated
- [ ] Trigger conditions reviewed
- [ ] Dependencies confirmed available

## Prohibited Actions

NEVER perform these without explicit user request:
1. Bulk workflow modifications
2. Deleting multiple workflows
3. Modifying production workflows without confirmation
4. Changing webhook URLs on active workflows
5. Disabling error notifications

## Error Recovery

If an operation fails:
1. Report exact error message
2. Do NOT retry automatically
3. Suggest corrective actions
4. Offer to restore from backup if available

## Audit Trail

For every modification, log:
```markdown
## Modification Log
- **Timestamp**: {ISO timestamp}
- **Instance**: {instance}
- **Workflow**: {id} - {name}
- **Operation**: {operation}
- **Changes**: {summary}
- **User Confirmation**: {confirmation text}
```

## Operational Awareness

### Execution Retention

Default execution retention is aggressive (~14 days / 10,000 max). With high-volume instances running ~640 executions/day, history fills up quickly. Configure `EXECUTIONS_DATA_MAX_AGE` and `EXECUTIONS_DATA_PRUNE_MAX_COUNT` in n8n environment variables for adequate history retention.

### GHL OAuth Token Expiry

GHL (GoHighLevel) OAuth2 refresh tokens expire and get revoked unpredictably, breaking all native `n8n-nodes-base.highLevel` nodes with `"The provided authorization grant... is invalid, expired, revoked..."` errors.

**Solution**: Replace native GHL OAuth nodes with HTTP Request nodes using **GHL v1 API** + location API key (Header Auth credential). The v1 API at `https://rest.gohighlevel.com/v1/` uses a stable per-location API key that does not expire.

### Email Rate Limits in Error Handlers

Error handler workflows that send notification emails can themselves fail when multiple executions error simultaneously. Email providers like Resend enforce strict rate limits (2 req/sec). Add a Wait node (1-2 seconds) before email sends in error workflows to prevent cascading failures.
