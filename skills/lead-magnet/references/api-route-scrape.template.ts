// ============================================================================
// TEMPLATE — app/api/scrape/route.ts
// ============================================================================
// This is a REFERENCE TEMPLATE, not compile-ready code. Replace every
// {{PLACEHOLDER}} with PRD-derived values, then drop it in at
//   app/api/scrape/route.ts
// in the generated Next.js project.
//
// What it does: takes the cold-email URL param (LinkedIn URL, company site,
// etc.), runs an Apify actor to enrich it, normalizes the result into the
// shape your /api/generate route expects, and falls back to a slug-inferred
// stub if the scrape fails (so the page still renders something).
//
// Derived from the proven bestseller-angle-finder scrape route. The parts that
// change per lead magnet are marked `// from PRD`. Everything else (Apify
// run/poll loop, fallback-to-infer, error handling) is reusable verbatim.
//
// PRD fields consumed here:
//   scrape_source     -> {{SCRAPE_ACTOR_ID}}     (Apify actor, e.g. dev_fusion~Linkedin-Profile-Scraper)
//   input_param       -> {{INPUT_FIELD}}          (request body key, e.g. linkedinUrl / siteUrl)
//   input_validator   -> {{INPUT_VALIDATOR}}      (substring that must be present, e.g. "linkedin.com/in/")
//   (actor input)     -> {{SCRAPE_REQUEST_BODY}}  (the JSON body this actor expects)
//   ai_output_shape   -> {{PROFILE_INTERFACE}} / {{NORMALIZE_BODY}}
// ============================================================================
import { NextResponse } from 'next/server';

const APIFY_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = '{{SCRAPE_ACTOR_ID}}'; // from PRD scrape_source

// from PRD ai_output_shape — the normalized shape passed to /api/generate.
interface EnrichedProfile {
  {{PROFILE_INTERFACE}}
  // e.g.
  // fullName: string;
  // headline: string;
  // currentRole: string;
  // currentCompany: string;
  // experience: { title: string; company: string; duration: string; description: string }[];
  sourceUrl: string;
}

// Fallback when the scrape returns nothing — derive a minimal stub from the URL
// slug so the page still renders. Tune per PRD scrape_fallback.
function inferFromInput(input: string): EnrichedProfile {
  const slug =
    input.split('/').filter(Boolean).pop()?.split('?')[0]?.replace(/\/$/, '') || '';
  const nameGuess = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    {{INFER_FALLBACK_BODY}}
    // e.g. fullName: nameGuess || 'Unknown', headline: 'Professional', experience: [],
    sourceUrl: input,
  } as EnrichedProfile;
}

// from PRD — map the actor's raw dataset item into EnrichedProfile.
function normalizeProfile(data: any, input: string): EnrichedProfile {
  if (!data) return inferFromInput(input);
  return {
    {{NORMALIZE_BODY}}
    // e.g. fullName: data.fullName || inferFromInput(input).fullName,
    //      headline: data.headline || '',
    //      experience: (data.experiences || []).map(...),
    sourceUrl: input,
  } as EnrichedProfile;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: string = body.{{INPUT_FIELD}}; // from PRD input_param

    // from PRD input_validator
    if (!input || !input.includes('{{INPUT_VALIDATOR}}')) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'Apify API token not configured' },
        { status: 500 }
      );
    }

    // Start the actor run and wait (waitForFinish caps at 60s server-side; we poll the dataset).
    const runResponse = await fetch(
      `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${apiToken}&waitForFinish=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // from PRD — the input body this actor expects.
        body: JSON.stringify({ {{SCRAPE_REQUEST_BODY}} }), // e.g. profileUrls: [input]
      }
    );

    // Any failure -> graceful partial fallback so the page still renders.
    if (!runResponse.ok) {
      console.error('Apify run failed:', await runResponse.text());
      return NextResponse.json({ success: true, data: inferFromInput(input), partial: true });
    }

    const runData = await runResponse.json();
    const { status, defaultDatasetId } = runData.data;
    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ success: true, data: inferFromInput(input), partial: true });
    }

    const datasetResponse = await fetch(
      `${APIFY_BASE}/datasets/${defaultDatasetId}/items?token=${apiToken}&format=json`
    );
    if (!datasetResponse.ok) {
      return NextResponse.json({ success: true, data: inferFromInput(input), partial: true });
    }

    const items = await datasetResponse.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, data: inferFromInput(input), partial: true });
    }

    const profile = normalizeProfile(items[0], input);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error scraping:', error);
    return NextResponse.json({ success: false, error: 'Failed to scrape' }, { status: 500 });
  }
}
