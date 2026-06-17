import type { Command } from "commander";
import { openaiAdsFetch } from "../client";
import { handleOutput, exitWithError } from "../shared/output";

interface GeoResult {
  id: string;
  name: string;
  type?: string;
  parent_id?: string;
}

interface GeoSearchResponse {
  results: GeoResult[];
}

export function registerGeo(parent: Command): void {
  const cmd = parent
    .command("geo <query>")
    .description("Search for geo targeting IDs by name (e.g., 'United States', 'California', '10001')")
    .option("--json", "Output as JSON")
    .action(async (query, opts) => {
      try {
        const q = encodeURIComponent(query);
        const data = await openaiAdsFetch<GeoSearchResponse>(
          `/geo_lookup/search?q=${q}`,
        );
        handleOutput(data.results, {
          json: opts.json,
          columns: ["id", "name", "type", "parent_id"],
        });
      } catch (e) {
        exitWithError(e);
      }
    });
}
