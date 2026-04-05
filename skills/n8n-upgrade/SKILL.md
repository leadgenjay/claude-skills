---
name: n8n-upgrade
description: >
  Find and upgrade RAM for n8n Docker containers on Zeus server. SSHes into Zeus,
  finds the matching n8n container, shows current memory/CPU stats, asks what
  multiplier to use (2x, 3x, or 5x current RAM), applies the change via
  docker update, and verifies the new limit. Use when the user says "n8n-upgrade",
  "increase ram", "upgrade n8n", "n8n memory", "container ram", "scale n8n",
  or wants to resize an n8n instance on Zeus.
triggers:
  - "n8n-upgrade"
  - "increase ram"
  - "upgrade n8n"
  - "n8n memory"
  - "container ram"
  - "scale n8n"
  - "n8n ram"
tags:
  - zeus
  - docker
  - n8n
  - memory
  - scaling
matching: fuzzy
---

# n8n-upgrade — Resize n8n Container RAM on Zeus

Find an n8n Docker container on Zeus and increase its memory allocation.
Always shows current stats first, then asks the user to pick a multiplier.

## SSH Access
All Zeus commands use: `ssh root@zeus "<command>"`

---

## Workflow

### Step 1: Identify the Container

The user provides a container name or partial match (e.g., "320 Creative", "nextwave", "consulti").

Normalize the search term — strip spaces, lowercase — then search:

```bash
ssh root@zeus "docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}' | grep -i '<search_term>'"
```

**If no match**: Try variations (remove spaces, try partial). If still nothing, list all n8n containers and ask the user to pick:
```bash
ssh root@zeus "docker ps --format '{{.Names}}\t{{.Status}}' | grep n8n"
```

**If multiple matches**: Show all matches and ask the user which one to upgrade.

**If exactly one match**: Proceed to Step 2.

### Step 2: Gather Current Stats

Run these two commands in parallel:

**Live usage:**
```bash
ssh root@zeus "docker stats <container_name> --no-stream --format 'CPU%: {{.CPUPerc}}\nMem Usage: {{.MemUsage}}\nMem%: {{.MemPerc}}\nNet I/O: {{.NetIO}}\nBlock I/O: {{.BlockIO}}\nPIDs: {{.PIDs}}'"
```

**Configuration (memory limit, CPU, restart policy, uptime, mounts):**
```bash
ssh root@zeus "docker inspect <container_name>" | python3 -c "
import json, sys
d = json.load(sys.stdin)[0]
hc = d['HostConfig']
state = d['State']
mem = hc['Memory']
print(f'Memory Limit: {mem} bytes ({mem//1024//1024}MB)')
print(f'Memory Reservation: {hc[\"MemoryReservation\"]}')
print(f'NanoCPUs: {hc[\"NanoCpus\"]}')
print(f'Restart Policy: {hc[\"RestartPolicy\"][\"Name\"]}')
print(f'Started At: {state[\"StartedAt\"]}')
print(f'Status: {state[\"Status\"]}')
for m in d.get('Mounts', []):
    print(f'Mount: {m[\"Source\"]} -> {m[\"Destination\"]}')
"
```

### Step 3: Display Stats Table

Present the stats in a clear table format:

```
| Setting | Value |
|---------|-------|
| **Container** | <name> |
| **Image** | <image> |
| **Status** | Running |
| **Uptime** | <started_at> |
| **Restart Policy** | <policy> |

| Metric | Value |
|--------|-------|
| **Memory Limit** | <current_limit> |
| **Memory Usage** | <usage> / <limit> (<percent>%) |
| **CPU Limit** | <nanoCPUs as cores> |
| **CPU Usage** | <percent>% |
| **PIDs** | <count> |
```

### Step 4: Ask for RAM Multiplier

Calculate the three options based on the current memory limit and **always** ask the user using AskUserQuestion:

- **2x**: current_limit * 2
- **3x**: current_limit * 3
- **5x**: current_limit * 5

Format option labels with human-readable sizes (e.g., "2x — 1024 MB (1 GB)").

Mark the recommended option based on current usage:
- Usage < 50%: 2x (Recommended)
- Usage 50-80%: 3x (Recommended)
- Usage > 80%: 5x (Recommended)

### Step 5: Apply the Change

Calculate new limit in bytes and apply:

```bash
ssh root@zeus "docker update --memory=<new_limit_bytes> <container_name>"
```

The swap warning `"Your kernel does not support swap limit capabilities..."` is **normal on Unraid** — the memory limit is still applied. Note this to the user so they don't worry.

### Step 6: Verify

Confirm the new limit took effect:

```bash
ssh root@zeus "docker stats <container_name> --no-stream --format 'Mem Usage: {{.MemUsage}} ({{.MemPerc}})'"
```

Report the new usage percentage against the updated limit. A successful upgrade shows a lower percentage with the new higher limit.

---

## Error Handling

- **SSH fails**: Report "Zeus unreachable via SSH" and stop
- **Container not found**: List all n8n containers and let the user pick
- **docker update fails**: Show the error and suggest checking if the container is running
- **Verification fails**: Note it but consider the upgrade successful if docker update returned the container name
