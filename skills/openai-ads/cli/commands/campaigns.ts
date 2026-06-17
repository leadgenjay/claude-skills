import type { Command } from "commander";
import { openaiAdsFetch, usdToMicros } from "../client";
import { handleOutput, exitWithError } from "../shared/output";
import { addWriteFlags, requireConfirm } from "../shared/write-guard";

interface Campaign {
  id: string;
  name: string;
  status: string;
  description?: string;
  budget?: { lifetime_spend_limit_micros: number };
  targeting?: Record<string, unknown>;
  start_time?: number;
  end_time?: number;
}

interface CampaignListResponse {
  campaigns: Campaign[];
}

export function registerCampaigns(parent: Command): void {
  const cmd = parent.command("campaigns").description("Manage campaigns");

  cmd
    .command("list")
    .description("List all campaigns")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const data = await openaiAdsFetch<Campaign[] | CampaignListResponse>("/campaigns");
        // Handle both direct array and envelope responses
        const campaigns = Array.isArray(data) ? data : (data as CampaignListResponse).campaigns || [];
        handleOutput(campaigns, {
          json: opts.json,
          columns: ["id", "name", "status", "description"],
        });
      } catch (e) {
        exitWithError(e);
      }
    });

  cmd
    .command("get <id>")
    .description("Get campaign by ID")
    .option("--json", "Output as JSON")
    .action(async (id, opts) => {
      try {
        const data = await openaiAdsFetch<Campaign>(`/campaigns/${id}`);
        handleOutput(data, { json: true });
      } catch (e) {
        exitWithError(e);
      }
    });

  const create = cmd
    .command("create")
    .description("Create a campaign (defaults to paused)")
    .requiredOption("--name <name>", "Campaign name (3-1000 chars)")
    .option("--description <text>", "Campaign description")
    .option("--budget-usd <amount>", "Lifetime budget in USD (min $1)")
    .option("--geo <id>", "Geo ID for targeting (repeatable)", [])
    .option("--start-time <unix>", "Start time (unix seconds)")
    .option("--end-time <unix>", "End time (unix seconds)")
    .option("--json", "Output as JSON");
  addWriteFlags(create).action(async (opts) => {
    try {
      const body: Record<string, unknown> = {
        name: opts.name,
        status: "paused", // Always create paused for safety
        ...(opts.description && { description: opts.description }),
      };

      // Budget is required; default to $1000 if not specified
      const budgetUsd = opts.budgetUsd ? Number(opts.budgetUsd) : 1000;
      if (budgetUsd < 1) {
        console.error("error: budget must be at least $1");
        process.exit(1);
      }
      body.budget = {
        lifetime_spend_limit_micros: usdToMicros(budgetUsd),
      };

      // Geo targeting
      const geoIds: string[] = Array.isArray(opts.geo) ? opts.geo : [opts.geo].filter(Boolean);
      if (geoIds.length > 0) {
        body.targeting = {
          locations: {
            include: geoIds.map((id) => ({ id })),
          },
        };
      }

      if (opts.startTime) body.start_time = Number(opts.startTime);
      if (opts.endTime) body.end_time = Number(opts.endTime);

      if (!requireConfirm(opts, "create campaign", body)) return;
      const data = await openaiAdsFetch<Campaign>("/campaigns", {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });

  const pause = cmd
    .command("pause <id>")
    .description("Pause a campaign")
    .option("--json", "Output as JSON");
  addWriteFlags(pause).action(async (id, opts) => {
    try {
      const body = { status: "paused" };
      if (!requireConfirm(opts, "pause campaign", body)) return;
      const data = await openaiAdsFetch<Campaign>(`/campaigns/${id}/pause`, {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });

  const activate = cmd
    .command("activate <id>")
    .description("Activate a campaign")
    .option("--json", "Output as JSON");
  addWriteFlags(activate).action(async (id, opts) => {
    try {
      const body = { status: "active" };
      if (!requireConfirm(opts, "activate campaign", body)) return;
      const data = await openaiAdsFetch<Campaign>(`/campaigns/${id}/activate`, {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });

  const archive = cmd
    .command("archive <id>")
    .description("Archive a campaign (irreversible)")
    .option("--json", "Output as JSON");
  addWriteFlags(archive).action(async (id, opts) => {
    try {
      const body = { status: "archived" };
      if (!requireConfirm(opts, "archive campaign", body)) return;
      const data = await openaiAdsFetch<Campaign>(`/campaigns/${id}/archive`, {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });
}
