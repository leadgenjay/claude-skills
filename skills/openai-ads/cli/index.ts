#!/usr/bin/env node
import { Command } from "commander";
import { registerAdAccount } from "./commands/ad-account";
import { registerCampaigns } from "./commands/campaigns";
import { registerAdGroups } from "./commands/adgroups";
import { registerAds } from "./commands/ads";
import { registerGeo } from "./commands/geo";
import { registerUpload } from "./commands/upload";
import { registerInsights } from "./commands/insights";

const program = new Command();

program
  .name("openai-ads")
  .description("CLI for the OpenAI Ads API (ChatGPT ad campaign management)")
  .version("1.0.0");

registerAdAccount(program);
registerCampaigns(program);
registerAdGroups(program);
registerAds(program);
registerGeo(program);
registerUpload(program);
registerInsights(program);

program.parseAsync().catch((e) => {
  console.error("CLI error:", e);
  process.exit(1);
});
