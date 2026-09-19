/**
 * test_agent1.mjs
 * Standalone test suite for Agent 1 – Ingestion & Authenticity
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  calculateSHA256,
  detectSyntheticText,
  runAuthenticityIngestion
} from './services/agent1Service.js';

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

// ─── Test Data ────────────────────────────────────────────────────────────────

const humanResumeText = `
  Alex Mercer | alex.mercer@gmail.com | github.com/alex-mercer
  Senior Software Engineer, TechCorp (2023 – Present)
  - Wrote core Go services to sync internal caches, reducing CPU by 18%.
  - Built REST endpoints for project catalog using Postgres.
  - Set up Docker files for team deployments.
  Skills: Go, SQL, Docker, Linux, Git.
`;

const syntheticResumeText = `
  Jordan Vance | jordan.vance@talentos.io
  Dynamic and pioneering Software Specialist. I delve into complex technical
  architectures to leverage cutting-edge paradigms. A testament to my dedication
  is fostering a holistic and seamless tapestry of multifaceted experiences.
  Skills: Advanced Reasoning, Tapestry Scaling, Holistic Synergy, Leverage.
`;

async function runTests() {
  console.log(BOLD(CYAN('\n══════════════════════════════════════════════════════')));
  console.log(BOLD(CYAN('  Agent 1 – Ingestion & Authenticity Test Suite')));
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));

  // ── Group 1: SHA-256 Hashing ──────────────────────────────────────────────
  console.log(BOLD('[ Group 1 ] SHA-256 Cryptographic Hashing'));
  try {
    const bufA = Buffer.from(humanResumeText);
    const bufB = Buffer.from(syntheticResumeText);
    const hashA = calculateSHA256(bufA);
    const hashB = calculateSHA256(bufB);

    assert(typeof hashA === 'string' && hashA.length === 64, 'SHA-256 hash is 64-char hex string');
    assert(hashA !== hashB, 'Different documents produce different hashes');
    assert(calculateSHA256(bufA) === hashA, 'Same document produces identical hash (deterministic)');

    console.log(`  ${YELLOW('ℹ')} Human resume hash: ${hashA.slice(0, 16)}...`);
    console.log(`  ${YELLOW('ℹ')} AI resume hash:    ${hashB.slice(0, 16)}...`);
  } catch (err) {
    console.log(`  ${RED('✘')} SHA-256 group failed: ${err.message}`);
    failed += 3;
  }

  // ── Group 2: Synthetic Text Detection ────────────────────────────────────
  console.log(BOLD('\n[ Group 2 ] Synthetic AI Text Detector'));
  try {
    const resultA = await detectSyntheticText(humanResumeText);
    const resultB = await detectSyntheticText(syntheticResumeText);

    assert(typeof resultA.syntheticScore === 'number', 'Returns numeric syntheticScore');
    assert(resultA.syntheticScore >= 0 && resultA.syntheticScore <= 1, 'Score is in [0, 1] range');
    assert(typeof resultA.isSynthetic === 'boolean', 'Returns boolean isSynthetic flag');
    assert(typeof resultA.modelUsed === 'string', 'Returns modelUsed field');

    const syntheticScoreB = (resultB.syntheticScore * 100).toFixed(1);
    const humanScoreA = (resultA.syntheticScore * 100).toFixed(1);
    console.log(`  ${YELLOW('ℹ')} Human resume synthetic score: ${humanScoreA}% → flagged=${resultA.isSynthetic}`);
    console.log(`  ${YELLOW('ℹ')} AI resume synthetic score:    ${syntheticScoreB}% → flagged=${resultB.isSynthetic}`);
  } catch (err) {
    console.log(`  ${RED('✘')} Synthetic detector group failed: ${err.message}`);
    failed += 4;
  }

  // ── Group 3: Full Ingestion Pipeline ─────────────────────────────────────
  console.log(BOLD('\n[ Group 3 ] Full Ingestion Pipeline'));
  try {
    const bufA = Buffer.from(humanResumeText);
    const result = await runAuthenticityIngestion(bufA, 'text/plain', 'alex.mercer@gmail.com');

    assert(typeof result === 'object' && result !== null, 'Ingestion returns result object');
    assert(typeof result.hash === 'string' && result.hash.length === 64, 'Result contains 64-char SHA-256 hash');
    assert(typeof result.synthetic === 'object', 'Result contains synthetic analysis object');
    assert(typeof result.isDuplicate === 'boolean', 'Result contains isDuplicate boolean');

    console.log(`  ${YELLOW('ℹ')} Ingestion result: hash=${result.hash.slice(0, 16)}... isDuplicate=${result.isDuplicate}`);
  } catch (err) {
    console.log(`  ${RED('✘')} Ingestion pipeline group failed: ${err.message}`);
    failed += 4;
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

if (process.argv[1].endsWith('test_agent1.mjs')) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0)).catch(console.error);
}
