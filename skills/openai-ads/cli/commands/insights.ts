import type { Command } from "commander";
import { openaiAdsFetch } from "../client";
import { handleOutput, exitWithError } from "../shared/output";

interface InsightsResponse {
  // TODO: verify exact schema against https://developers.openai.com/docs/guides/ads/insights
  // Stub until the endpoint schema is confirmed. Typical fields:
  // campaign_id, ad_group_id, ad_id, impressions, clicks, spend_micros, etc.
  [key: string]: unknown;
}

export function registerInsights(parent: Command): void {
  const cmd = parent.command("insights").description("Fetch read-only reporting and insights");

  cmd
    .command("report")
    .description(
      "Get insights report (TODO: verify endpoint and schema at https://developers.openai.com/docs/guides/ads/insights)",
    )
    .option("--campaign-id <id>", "Filter by campaign ID")
    .option("--ad-group-id <id>", "Filter by ad group ID")
    .option("--ad-id <id>", "Filter by ad ID")
    .option("--start-date <YYYY-MM-DD>", "Start date")
    .option("--end-date <YYYY-MM-DD>", "End date")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      try {
        // Build query params
        const params = new URLSearchParams();
        if (opts.campaignId) params.append("campaign_id", opts.campaignId);
        if (opts.adGroupId) params.append("ad_group_id", opts.adGroupId);
        if (opts.adId) params.append("ad_id", opts.adId);
        if (opts.startDate) params.append("start_date", opts.startDate);
        if (opts.endDate) params.append("end_date", opts.endDate);

        const qs = params.toString();
        const path = qs ? `/insights?${qs}` : "/insights";

        const data = await openaiAdsFetch<InsightsResponse>(path);
        handleOutput(data, { json: opts.json });
      } catch (e) {
        exitWithError(e);
      }
    });
}
