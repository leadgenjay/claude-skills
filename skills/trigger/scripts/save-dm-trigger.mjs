#!/usr/bin/env node

/**
 * Save a DM keyword trigger to Notion + Supabase.
 *
 * Usage:
 *   node scripts/save-dm-trigger.mjs --keyword "CODE" --message "Hey! Here's the cheatsheet..."
 *   node scripts/save-dm-trigger.mjs --keyword "CODE" --message "..." --trigger-type "both" --channels "IG, LinkedIn"
 *
 * Requires NOTION_API_KEY and NOTION_DM_TRIGGERS_DB_ID in .env.local
 */

import dotenv from 'dotenv'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '..', '..', '.env.local') })

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DB_ID = process.env.NOTION_DM_TRIGGERS_DB_ID
const WEBHOOK_URL = 'https://www.lgjsocial.com/api/webhooks/notion-triggers'

// ── Parse CLI args ──────────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    keyword: { type: 'string' },
    message: { type: 'string' },
  },
  strict: true,
})

const keyword = values.keyword?.trim()
const message = values.message?.trim()

if (!keyword || !message) {
  console.error('Usage: node scripts/save-dm-trigger.mjs --keyword "KEYWORD" --message "MESSAGE"')
  process.exit(1)
}

if (!NOTION_API_KEY) {
  console.error('Missing NOTION_API_KEY in .env.local')
  process.exit(1)
}

if (!NOTION_DB_ID) {
  console.error('Missing NOTION_DM_TRIGGERS_DB_ID in .env.local')
  process.exit(1)
}

// ── Create Notion page ──────────────────────────────────────────────
async function createNotionPage() {
  const body = {
    parent: { database_id: NOTION_DB_ID },
    properties: {
      Keyword: {
        title: [{ text: { content: keyword } }],
      },
      Message: {
        rich_text: [{ text: { content: message } }],
      },
      'Setup Complete': {
        checkbox: true,
      },
    },
  }

  // Note: Trigger Type and Channels properties removed — not in Notion DB schema

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Notion API error ${res.status}: ${JSON.stringify(error)}`)
  }

  return res.json()
}

// ── POST to webhook (Supabase upsert) ──────────────────────────────
async function postToWebhook() {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, message }),
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(`Webhook error ${res.status}: ${JSON.stringify(body)}`)
  }

  return { status: res.status, body }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSaving DM trigger: "${keyword}"`)
  console.log(`Message: ${message.slice(0, 80)}${message.length > 80 ? '...' : ''}`)
  console.log()

  // Step 1: Create in Notion
  let notionSuccess = false
  try {
    const page = await createNotionPage()
    console.log(`  Notion: Created page ${page.id}`)
    notionSuccess = true
  } catch (err) {
    console.error(`  Notion: FAILED - ${err.message}`)
  }

  // Step 2: POST to webhook (Supabase)
  let supabaseSuccess = false
  try {
    const { status, body } = await postToWebhook()
    const action = status === 201 ? 'Created' : 'Updated'
    console.log(`  Supabase: ${action} trigger (id: ${body.id})`)
    supabaseSuccess = true
  } catch (err) {
    console.error(`  Supabase: FAILED - ${err.message}`)
  }

  // Report
  console.log()
  if (notionSuccess && supabaseSuccess) {
    console.log('Saved to Notion + Supabase')
  } else if (notionSuccess) {
    console.log('Saved to Notion only (Supabase failed)')
    process.exit(1)
  } else if (supabaseSuccess) {
    console.log('Saved to Supabase only (Notion failed)')
    process.exit(1)
  } else {
    console.log('Both saves failed')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
