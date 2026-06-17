import type { Command } from "commander";
import { openaiAdsFetch } from "../client";
import { handleOutput, exitWithError } from "../shared/output";
import { addWriteFlags, requireConfirm } from "../shared/write-guard";

interface Ad {
  id: string;
  ad_group_id: string;
  name: string;
  status: string;
  creative?: {
    type: string;
    title: string;
    body: string;
    target_url: string;
    file_id: string;
  };
  review_status?: string;
}

interface AdListResponse {
  ads: Ad[];
}

export function registerAds(parent: Command): void {
  const cmd = parent.command("ads").description("Manage ads");

  cmd
    .command("list")
    .description("List all ads")
    .option("--ad-group-id <id>", "Filter by ad group ID")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        const url = opts.adGroupId ? `/ads?ad_group_id=${opts.adGroupId}` : "/ads";
        const data = await openaiAdsFetch<Ad[] | AdListResponse>(url);
        // Handle both direct array and envelope responses
        const ads = Array.isArray(data) ? data : (data as AdListResponse).ads || [];
        handleOutput(ads, {
          json: opts.json,
          columns: ["id", "ad_group_id", "name", "status", "review_status"],
        });
      } catch (e) {
        exitWithError(e);
      }
    });

  cmd
    .command("get <id>")
    .description("Get ad by ID")
    .option("--json", "Output as JSON")
    .action(async (id, opts) => {
      try {
        const data = await openaiAdsFetch<Ad>(`/ads/${id}`);
        handleOutput(data, { json: true });
      } catch (e) {
        exitWithError(e);
      }
    });

  const create = cmd
    .command("create")
    .description("Create an ad (defaults to paused)")
    .requiredOption("--ad-group-id <id>", "Parent ad group ID")
    .requiredOption("--name <name>", "Ad name (internal label, 3-1000 chars)")
    .requiredOption("--title <title>", "Creative title (3-50 chars)")
    .requiredOption("--body <text>", "Creative body (≤100 chars)")
    .requiredOption("--target-url <url>", "Landing URL (supports UTM params)")
    .requiredOption("--file-id <id>", "File ID from upload command")
    .option("--json", "Output as JSON");
  addWriteFlags(create).action(async (opts) => {
    try {
      // Validate title and body length
      if (opts.title.length > 50) {
        console.error("error: title must be ≤50 chars");
        process.exit(1);
      }
      if (opts.body.length > 100) {
        console.error("error: body must be ≤100 chars");
        process.exit(1);
      }

      const body: Record<string, unknown> = {
        ad_group_id: opts.adGroupId,
        name: opts.name,
        status: "paused", // Always create paused for safety
        creative: {
          type: "chat_card",
          title: opts.title,
          body: opts.body,
          target_url: opts.targetUrl,
          file_id: opts.fileId,
        },
      };

      if (!requireConfirm(opts, "create ad", body)) return;
      const data = await openaiAdsFetch<Ad>("/ads", {
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
    .description("Pause an ad");
  addWriteFlags(pause).action(async (id, opts) => {
    try {
      const body = { status: "paused" };
      if (!requireConfirm(opts, "pause ad", body)) return;
      const data = await openaiAdsFetch<Ad>(`/ads/${id}/pause`, {
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
    .description("Activate an ad");
  addWriteFlags(activate).action(async (id, opts) => {
    try {
      const body = { status: "active" };
      if (!requireConfirm(opts, "activate ad", body)) return;
      const data = await openaiAdsFetch<Ad>(`/ads/${id}/activate`, {
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
    .description("Archive an ad (irreversible)");
  addWriteFlags(archive).action(async (id, opts) => {
    try {
      const body = { status: "archived" };
      if (!requireConfirm(opts, "archive ad", body)) return;
      const data = await openaiAdsFetch<Ad>(`/ads/${id}/archive`, {
        method: "POST",
        body,
      });
      handleOutput(data, { json: opts.json });
    } catch (e) {
      exitWithError(e);
    }
  });
}
