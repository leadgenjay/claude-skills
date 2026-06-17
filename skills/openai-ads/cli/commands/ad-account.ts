import type { Command } from "commander";
import { openaiAdsFetch, redactKey } from "../client";
import { handleOutput, exitWithError, printJson } from "../shared/output";

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  review_status: string;
}

export function registerAdAccount(parent: Command): void {
  const cmd = parent.command("verify").description("Verify API key and fetch ad account info");

  cmd.action(async () => {
    try {
      const data = await openaiAdsFetch<AdAccount>("/ad_account");
      handleOutput(data, { json: true });
    } catch (e) {
      exitWithError(e);
    }
  });
}
