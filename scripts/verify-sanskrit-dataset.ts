#!/usr/bin/env node
/**
 * verify-sanskrit-dataset.ts
 *
 * Validates the 30-question Sanskrit MCQ dataset for structural integrity.
 * Run:  npx tsx scripts/verify-sanskrit-dataset.ts
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RawMCQ {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  category: string;
  time_limit_sec: number;
}

// ── Load Dataset ─────────────────────────────────────────────────────────────
const datasetPath = resolve(__dirname, '..', 'src', 'data', 'sanskritQuestionsDataset.json');
let dataset: RawMCQ[];

try {
  const raw = readFileSync(datasetPath, 'utf-8');
  dataset = JSON.parse(raw);
} catch (err: any) {
  console.error(`❌ Failed to load dataset at ${datasetPath}:`, err.message);
  process.exit(1);
}

// ── Validation ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(message);
  }
}

// 1. Dataset is an array with exactly 30 entries
assert(Array.isArray(dataset), 'Dataset must be a JSON array');
assert(dataset.length === 30, `Expected 30 questions, found ${dataset.length}`);

// 2. All IDs are unique
const ids = dataset.map((q) => q.id);
const uniqueIds = new Set(ids);
assert(uniqueIds.size === dataset.length, `Duplicate IDs found: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);

// 3. Per-question structural checks
const categoryCounts: Record<string, number> = {};

dataset.forEach((q, idx) => {
  const prefix = `[${idx}] ${q.id}`;

  // ID is non-empty
  assert(typeof q.id === 'string' && q.id.length > 0, `${prefix}: id must be a non-empty string`);

  // Question text is non-empty
  assert(typeof q.question === 'string' && q.question.length > 0, `${prefix}: question must be a non-empty string`);

  // Exactly 4 options
  assert(Array.isArray(q.options) && q.options.length === 4, `${prefix}: must have exactly 4 options, found ${q.options?.length}`);

  // All options are non-empty strings
  if (Array.isArray(q.options)) {
    q.options.forEach((opt, oi) => {
      assert(typeof opt === 'string' && opt.length > 0, `${prefix}: option[${oi}] must be a non-empty string`);
    });
  }

  // correct_index is 0–3
  assert(
    typeof q.correct_index === 'number' && Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index <= 3,
    `${prefix}: correct_index must be an integer 0–3, got ${q.correct_index}`
  );

  // category is non-empty
  assert(typeof q.category === 'string' && q.category.length > 0, `${prefix}: category must be a non-empty string`);

  // time_limit_sec is a positive integer
  assert(
    typeof q.time_limit_sec === 'number' && Number.isInteger(q.time_limit_sec) && q.time_limit_sec > 0,
    `${prefix}: time_limit_sec must be a positive integer, got ${q.time_limit_sec}`
  );

  // Track categories
  categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
});

// 4. Category distribution
assert(categoryCounts['Vyakaran'] === 20, `Expected 20 Vyakaran questions, found ${categoryCounts['Vyakaran'] ?? 0}`);
assert(categoryCounts['Literature'] === 10, `Expected 10 Literature questions, found ${categoryCounts['Literature'] ?? 0}`);

// 5. Verify SQL migration row count matches JSON
const migrationPath = resolve(__dirname, '..', 'supabase', 'migrations', '006_seed_sanskrit_mcq_dataset.sql');
try {
  const sqlContent = readFileSync(migrationPath, 'utf-8');
  // Count INSERT value rows (lines starting with ('sk_)
  const insertRowCount = (sqlContent.match(/\('sk_/g) || []).length;
  assert(
    insertRowCount === dataset.length,
    `SQL migration has ${insertRowCount} INSERT rows but JSON has ${dataset.length} entries`
  );
} catch {
  errors.push(`⚠  Could not read SQL migration at ${migrationPath} — skipping migration cross-check`);
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║   Sanskrit MCQ Dataset Verification Report          ║');
console.log('╠══════════════════════════════════════════════════════╣');
console.log(`║  Total questions : ${dataset.length.toString().padEnd(33)}║`);
console.log(`║  Categories      : ${Object.entries(categoryCounts).map(([k, v]) => `${k}(${v})`).join(', ').padEnd(32)}║`);
console.log(`║  Unique IDs      : ${uniqueIds.size.toString().padEnd(32)}║`);
console.log('╠══════════════════════════════════════════════════════╣');
console.log(`║  ✅ Passed : ${passed.toString().padEnd(39)}║`);
console.log(`║  ${failed > 0 ? '❌' : '✅'} Failed : ${failed.toString().padEnd(39)}║`);
console.log('╚══════════════════════════════════════════════════════╝');

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach((e) => console.log(`  • ${e}`));
}

console.log(
  failed === 0
    ? '\n🎉 All checks passed — dataset is valid and ready for ingestion!\n'
    : `\n⚠  ${failed} check(s) failed — please fix the issues above.\n`
);

process.exit(failed > 0 ? 1 : 0);
