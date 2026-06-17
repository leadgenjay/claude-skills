// HTTP client for the OpenAI Ads API.
// Docs: https://platform.openai.com/docs/guides/ads
//
// Base URL: https://api.ads.openai.com/v1
// Auth: Bearer token (sk-svcacct-...)
// All money amounts are in micros (USD × 1,000,000)

import { requireEnv, optionalEnv } from "./shared/env";
import * as fs from "node:fs";
import * as path from "node:path";

const OPENAI_ADS_BASE = "https://api.ads.openai.com/v1";

export function getApiKey(): string {
  // Try env var first, then fallback to ~/Downloads/ads-manager-api-key.txt
  let key = process.env.OPENAI_ADS_API_KEY;
  if (!key) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const fallbackPath = path.join(home, "Downloads", "ads-manager-api-key.txt");
    try {
      if (fs.existsSync(fallbackPath)) {
        key = fs.readFileSync(fallbackPath, "utf8").trim();
      }
    } catch {
      // Ignore file read errors; let requireEnv handle the missing key
    }
  }
  if (!key) {
    return requireEnv(
      "OPENAI_ADS_API_KEY",
      "store your service-account key in .env.local or ~/Downloads/ads-manager-api-key.txt",
    );
  }
  return key;
}

export interface OpenAIAdsFetchOptions {
  method?: string;
  body?: unknown;
  isMultipart?: boolean;
  file?: { fieldName: string; filename: string; data: Buffer };
}

// Helper to redact API key from output
export function redactKey(text: string): string {
  return text.replace(/(sk-svcacct-)[A-Za-z0-9_-]+/g, "$1<REDACTED>");
}

// Single request. Throws on transport error, non-2xx, or API error.
export async function openaiAdsFetch<T = unknown>(
  p: string,
  opts: OpenAIAdsFetchOptions = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  const init: RequestInit = { method, headers };

  // Multipart for file uploads
  if (opts.isMultipart && opts.file) {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(opts.file.data)], { type: "application/octet-stream" });
    formData.append(opts.file.fieldName, blob, opts.file.filename);
    init.body = formData as unknown as BodyInit;
    // Don't set Content-Type; fetch will set it automatically with boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  } else {
    headers["Content-Type"] = "application/json";
  }

  const url = OPENAI_ADS_BASE + (p.startsWith("/") ? p : "/" + p);
  const res = await fetch(url, init);
  const text = await res.text();
  let json: T | undefined;

  try {
    json = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    throw new Error(`OpenAI Ads API HTTP ${res.status}: ${redactKey(text) || res.statusText}`);
  }
  if (!json) {
    throw new Error("OpenAI Ads API: empty response");
  }

  return json;
}

// Convert USD to micros (USD × 1,000,000)
export function usdToMicros(usd: number): number {
  return Math.round(usd * 1_000_000);
}

// Convert micros to USD
export function microsToUsd(micros: number): number {
  return micros / 1_000_000;
}
