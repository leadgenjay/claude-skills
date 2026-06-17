import type { Command } from "commander";
import { openaiAdsFetch, usdToMicros, microsToUsd } from "../client";
import { handleOutput, exitWithError } from "../shared/output";
import { addWriteFlags, requireConfirm } from "../shared/write-guard";

interface AdGroup {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  context_hints?: string[];
  bidding_config?: {
    billing_event_type: string;
    max_bid_micros: number;
  };
}

interface AdGroupListResponse {
  ad_groups: AdGroup[];
}

export function registerAdGroups(parent: Command): void {
  const cmd = parent.command("adgroups").description("Manage ad groups");

  cmd
    .command("list")
    .description("List all ad groups")
    .option("--campaign-id <id>", "Filter by campaign ID")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const url = opts.campaignId ? `/ad_groups?campaign_id=${opts.campaignId}` : "/ad_groups";
        const data = await openaiAdsFetch<AdGroup[] | AdGroupListResponse>(url);
        // Handle both direct array and envelope responses
        const adGroups = Array.isArray(data) ? data : (data as AdGroupListResponse).ad_groups || [];
        handleOutput(adGroups, {
          json: opts.json,
          columns: ["id", "campaign_id", "name", "status"],
        });
      } catch (e) {
        exitWithError(e);
      }
    });

  cmd
    .command("get <id>")
    .description("Get ad group by ID")
    .option("--json", "Output as JSON")
    .action(async (id, opts) => {
      try {
        const data = await openaiAdsFetch<AdGroup>(`/ad_groups/${id}`);
        handleOutput(data, { json: true });
      } catch (e) {
        exitWithError(e);
      }
    });

  const create = cmd
    .command("create")
    .description("Create an ad group (defaults to paused)")
    .requiredOption("--campaign-id <id>", "Parent campaign ID")
    .requiredOption("--name <name>", "Ad group name (3-1000 chars)")
    .requiredOption("--context-hint <hint>", "Context hint (repeatable)", (val: string, prev: string[]) => {
      return prev.concat([val]);
    }, [])
    .option("--max-bid-usd <amount>", "Max bid in USD for CPM (default $60)")
    .option("--json", "Output as JSON");
  addWriteFlags(create).action(async (opts) => {
    try {
      const contextHints: string[] = Array.isArray(opts.contextHint)
        ? opts.contextHint
        : [opts.contextHint].filter(Boolean);

      const body: Record<string, unknown> = {
        campaign_id: opts.campaignId,
        name: opts.name,
        status: "paused", // Always create paused for safety
        context_hints: contextHints,
        bidding_config: {
          billing_event_type: "impression", // CPM only in beta API
          max_bid_micros: usdToMicros(opts.maxBidUsd ? Number(opts.maxBidUsd) : 60),
        },
      };

      if (!requireConfirm(opts, "create ad group", body)) return;
      const data = await openaiAdsFetch<AdGroup>("/ad_groups", {
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
    .description("Pause an ad group");
  addWriteFlags(pause).action(async (id, opts) => {
    try {
      const body = { status: "paused" };
      if (!requireConfirm(opts, "pause ad group", body)) return;
      const data = await openaiAdsFetch<AdGroup>(`/ad_groups/${id}/pause`, {
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
    .description("Activate an ad group");
  addWriteFlags(activate).action(async (id, opts) => {
    try {
      const body = { status: "active" };
      if (!requireConfirm(opts, "activate ad group", body)) return;
      const data = await openaiAdsFetch<AdGroup>(`/ad_groups/${id}/activate`, {
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
    .description("Archive an ad group (irreversible)");
  addWriteFlags(archive).action(async (id, opts) => {
    try {
      const body = { status: "archived" };
      if (!requireConfirm(opts, "archive ad group", body)) return;
      const data = await openaiAdsFetch<AdGroup>(`/ad_groups/${id}/archive`, {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });
}
