#!/usr/bin/env node
/**
 * Run LaundryOS migrations against Supabase via the Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-migrations.mjs
 *
 * Get your access token at: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'ktsgugnxndvdiufhntxl';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('ERROR: Set SUPABASE_ACCESS_TOKEN env var first.');
  console.error('  Get one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const FILES = [
  '../supabase/migrations/001_foundation.sql',
  '../supabase/migrations/002_phase1_seed.sql',
  '../supabase/migrations/003_phase2_operations.sql',
  '../supabase/migrations/004_phase3_delivery_subscriptions.sql',
  '../supabase/migrations/005_phase4_api_keys.sql',
  '../supabase/seed.sql',
];

async function runSQL(sql, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

(async () => {
  console.log(`Running ${FILES.length} SQL files against project ${PROJECT_REF}...\n`);

  for (const relPath of FILES) {
    const fullPath = join(__dir, relPath);
    const label = relPath.split('/').pop();
    process.stdout.write(`  → ${label} ... `);

    const sql = readFileSync(fullPath, 'utf8');
    try {
      await runSQL(sql, label);
      console.log('✓');
    } catch (err) {
      console.log('✗');
      console.error(`\nError in ${label}:\n${err.message}\n`);
      process.exit(1);
    }
  }

  console.log('\nAll migrations applied successfully!');
})();
