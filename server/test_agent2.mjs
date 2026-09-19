/**
 * test_agent2.mjs
 * Standalone test suite for Agent 2 – Pitch VLM Evaluator & Devpost Webhook
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  gradePitchDeckWithVLM,
  processDevpostSubmission
} from './services/agent2Service.js';

const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ${GREEN('✔')} ${label}`);
    passed++;
  } else {
    console.log(`  ${RED('✘ FAILED:')} ${label}`);
    failed++;
  }
}

async function runTests() {
  console.log(BOLD(CYAN('\n══════════════════════════════════════════════════════')));
  console.log(BOLD(CYAN('  Agent 2 – Pitch VLM Evaluator Test Suite')));
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));

  // ── Group 1: VLM Pitch Deck Grading (null buffer → mock) ─────────────────
  console.log(BOLD('[ Group 1 ] VLM Pitch Deck Grading (Mock Fallback)'));
  try {
    const grades = await gradePitchDeckWithVLM(null, 'application/pdf');

    assert(typeof grades === 'object' && grades !== null, 'Returns grading object');
    assert(typeof grades.clarity === 'number' && grades.clarity >= 1 && grades.clarity <= 10, `Clarity score in [1,10] range (got ${grades.clarity})`);
    assert(typeof grades.viability === 'number' && grades.viability >= 1 && grades.viability <= 10, `Viability score in [1,10] range (got ${grades.viability})`);
    assert(typeof grades.technical === 'number' && grades.technical >= 1 && grades.technical <= 10, `Technical score in [1,10] range (got ${grades.technical})`);
    assert(typeof grades.business === 'number' && grades.business >= 1 && grades.business <= 10, `Business score in [1,10] range (got ${grades.business})`);
    assert(typeof grades.feedback === 'string' && grades.feedback.length > 0, 'Returns non-empty feedback string');

    console.log(`  ${YELLOW('ℹ')} Scores → Clarity:${grades.clarity} Viability:${grades.viability} Tech:${grades.technical} Biz:${grades.business}`);
  } catch (err) {
    console.log(`  ${RED('✘')} VLM grading group failed: ${err.message}`);
    failed += 6;
  }

  // ── Group 2: Devpost Webhook Pipeline ─────────────────────────────────────
  console.log(BOLD('\n[ Group 2 ] Devpost Submission Webhook Pipeline'));
  try {
    const mockPayload = {
      submission_id: 'test_hack_001',
      project_title: 'EcoSphere AI Carbon Tracker',
      pitch_deck_url: 'http://example.com/mock-pitch.pdf',  // triggers mock downloader fallback
      submitter_name: 'Jordan Vance',
      submitter_email: 'jordan.vance@test.io',
      skills_used: ['React', 'Neo4j', 'FastAPI']
    };

    const result = await processDevpostSubmission(mockPayload, null);

    assert(typeof result === 'object', 'Webhook returns result object');
    assert(result.success === true, 'Webhook reports success=true');
    assert(typeof result.projectId === 'string' && result.projectId.length > 0, 'Result contains project ID');
    assert(typeof result.grades === 'object', 'Result contains grades object');
    assert(typeof result.grades.clarity === 'number', 'Grades contain clarity score');

    console.log(`  ${YELLOW('ℹ')} Project ID: ${result.projectId}`);
    console.log(`  ${YELLOW('ℹ')} Grades: ${JSON.stringify(result.grades, null, 0).slice(0, 120)}`);
  } catch (err) {
    console.log(`  ${RED('✘')} Devpost webhook group failed: ${err.message}`);
    failed += 5;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(BOLD(CYAN('\n══════════════════════════════════════════════════════')));
  if (failed === 0) {
    console.log(GREEN(BOLD(`  ✔ ALL ${total} TESTS PASSED`)));
  } else {
    console.log(RED(BOLD(`  ✘ ${failed} of ${total} tests FAILED`)));
  }
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));
  return { passed, failed };
}

export { runTests };

if (process.argv[1].endsWith('test_agent2.mjs')) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0)).catch(console.error);
}
