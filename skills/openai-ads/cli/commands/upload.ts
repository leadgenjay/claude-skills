import type { Command } from "commander";
import { openaiAdsFetch } from "../client";
import { handleOutput, exitWithError, printJson } from "../shared/output";
import * as fs from "node:fs";
import * as path from "node:path";

interface UploadResponse {
  file_id: string;
  url?: string;
}

export function registerUpload(parent: Command): void {
  const cmd = parent.command("upload").description("Upload image creative assets");

  cmd
    .command("image-url <url>")
    .alias("--image-url <url>")
    .description("Upload image by URL (public HTTP/HTTPS)")
    .option("--json", "Output as JSON")
    .action(async (url, opts) => {
      try {
        // Validate URL format
        try {
          new URL(url);
        } catch {
          console.error("error: invalid URL");
          process.exit(1);
        }

        console.error(`uploading from ${url}...`);
        const body = { image_url: url };
        const data = await openaiAdsFetch<UploadResponse>("/upload", {
          method: "POST",
          body,
        });

        if (opts.json) {
          printJson(data);
        } else {
          console.log(`file_id: ${data.file_id}`);
        }
      } catch (e) {
        exitWithError(e);
      }
    });

  cmd
    .command("file <path>")
    .alias("--file <path>")
    .description("Upload image from local file (multipart, PNG/JPG)")
    .option("--json", "Output as JSON")
    .action(async (filePath, opts) => {
      try {
        // Resolve path
        const absPath = path.resolve(filePath);
        if (!fs.existsSync(absPath)) {
          console.error(`error: file not found: ${absPath}`);
          process.exit(1);
        }

        const stat = fs.statSync(absPath);
        if (!stat.isFile()) {
          console.error(`error: not a file: ${absPath}`);
          process.exit(1);
        }

        // Read file
        const fileData = fs.readFileSync(absPath);
        const filename = path.basename(absPath);

        console.error(`uploading ${filename} (${fileData.length} bytes)...`);

        const data = await openaiAdsFetch<UploadResponse>("/upload", {
          method: "POST",
          isMultipart: true,
          file: {
            fieldName: "image",
            filename,
            data: fileData,
          },
        });

        if (opts.json) {
          printJson(data);
        } else {
          console.log(`file_id: ${data.file_id}`);
        }
      } catch (e) {
        exitWithError(e);
      }
    });
}
