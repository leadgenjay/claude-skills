// ============================================================================
// TEMPLATE — app/api/generate/route.ts
// ============================================================================
// REFERENCE TEMPLATE, not compile-ready. Replace every {{PLACEHOLDER}} with
// PRD-derived values, then drop it in at app/api/generate/route.ts.
//
// What it does: receives the normalized profile from /api/scrape, runs it
// through Claude with a single system+user prompt, parses the JSON result, and
// returns the structured output the UI renders (cards / score / audit / etc.).
//
// Derived from the proven bestseller-angle-finder generate route. The Anthropic
// call, markdown-fence stripping, and error handling are reusable verbatim.
// Only the model + prompts + expected shape change per lead magnet.
//
// PRD fields consumed here:
//   ai_task         -> {{SYSTEM_PROMPT}} + {{USER_PROMPT_TEMPLATE}}
//   ai_output_shape -> {{RESULT_KEY}} + {{SHAPE_VALIDATION}}
//   (model)         -> {{CLAUDE_MODEL}}   (default: claude-sonnet-4-6)
// ============================================================================
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// from PRD — same shape /api/scrape produces.
interface EnrichedProfile {
  {{PROFILE_INTERFACE}}
  sourceUrl: string;
}

// Helper: flatten profile fields into the prompt. Tune per PRD ai_output_shape.
function formatProfile(p: EnrichedProfile): string {
  return `{{PROFILE_FORMAT_BLOCK}}`;
  // e.g.
  // return [
  //   `Name: ${p.fullName}`,
  //   `Headline: ${p.headline}`,
  //   `Role: ${p.currentRole} at ${p.currentCompany}`,
  // ].join('\n');
}

export async function POST(request: Request) {
  try {
    const { profile }: { profile: EnrichedProfile } = await request.json();

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Invalid profile data' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // from PRD ai_task — who Claude is and the rules of the output.
    const systemPrompt = `{{SYSTEM_PROMPT}}

Return valid JSON only.`;

    // from PRD ai_task — the per-request instruction. Must end by specifying the
    // exact JSON shape and "Return ONLY valid JSON, no markdown fences."
    const userPrompt = `{{USER_PROMPT_TEMPLATE}}

${formatProfile(profile)}

Return JSON: { "{{RESULT_KEY}}": [...] }
Return ONLY valid JSON, no markdown fences.`;

    const message = await anthropic.messages.create({
      model: '{{CLAUDE_MODEL}}', // from PRD — default claude-sonnet-4-6
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Strip accidental ```json fences before JSON.parse.
    let responseText = content.text.trim();
    responseText = responseText.replace(/^```json\n?/i, '').replace(/\n?```$/i, '');

    const result = JSON.parse(responseText);

    // from PRD ai_output_shape — validate before returning.
    {{SHAPE_VALIDATION}}
    // e.g. if (!result.angles || !Array.isArray(result.angles) || result.angles.length !== 3) {
    //   throw new Error('Invalid response format from Claude');
    // }

    return NextResponse.json({ success: true, {{RESULT_KEY}}: result.{{RESULT_KEY}} });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate output', detail: message },
      { status: 500 }
    );
  }
}
