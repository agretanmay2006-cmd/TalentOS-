/**
 * test_agent3.mjs
 * Standalone test suite for Agent 3 – Code Intelligence & AST Inspector
 */

import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

import {
  analyzeFile,
  analyzeRepository
} from './services/agent3Service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  console.log(BOLD(CYAN('  Agent 3 – Code Intelligence & AST Inspector Test Suite')));
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));

  // ── Group 1: Single File Analysis ────────────────────────────────────────
  console.log(BOLD('[ Group 1 ] Single File Analysis (analyzeFile)'));
  try {
    const targetFile = path.join(__dirname, 'services', 'agent1Service.js');
    const metrics = analyzeFile(targetFile);

    assert(metrics !== null, 'analyzeFile returns non-null result for a .js file');
    assert(metrics.language === 'JavaScript', `Language detected as JavaScript (got ${metrics.language})`);
    assert(typeof metrics.codeLines === 'number' && metrics.codeLines > 0, `Code lines counted (got ${metrics.codeLines})`);
    assert(typeof metrics.complexity === 'number' && metrics.complexity >= 1, `Cyclomatic complexity >= 1 (got ${metrics.complexity})`);
    assert(typeof metrics.commentLines === 'number', 'Comment lines counted');
    assert(typeof metrics.blankLines === 'number', 'Blank lines counted');
    assert(metrics.totalLines === metrics.codeLines + metrics.commentLines + metrics.blankLines, 
      'LOC + Comments + Blanks = Total Lines');

    console.log(`  ${YELLOW('ℹ')} agent1Service.js → LOC: ${metrics.codeLines}, Comments: ${metrics.commentLines}, Complexity: ${metrics.complexity}`);
  } catch (err) {
    console.log(`  ${RED('✘')} Single file analysis failed: ${err.message}`);
    failed += 7;
  }

  // ── Group 2: Returns null for non-code files ──────────────────────────────
  console.log(BOLD('\n[ Group 2 ] Non-Code File Handling'));
  try {
    const packageJson = path.join(__dirname, 'package.json');
    const result = analyzeFile(packageJson);
    assert(result === null, 'analyzeFile returns null for .json files (unsupported language)');
  } catch (err) {
    console.log(`  ${RED('✘')} Non-code file handling failed: ${err.message}`);
    failed += 1;
  }

  // ── Group 3: Repository Analysis ─────────────────────────────────────────
  console.log(BOLD('\n[ Group 3 ] Full Repository Analysis (analyzeRepository)'));
  try {
    const servicesDir = path.join(__dirname, 'services');
    const analysis = analyzeRepository(servicesDir);

    assert(typeof analysis === 'object', 'Returns analysis object');
    assert(Array.isArray(analysis.files), 'Contains files array');
    assert(analysis.files.length > 0, `At least 1 file analyzed (found ${analysis.files.length} files)`);
    assert(typeof analysis.aggregates.fileCount === 'number', 'Aggregates contain fileCount');
    assert(typeof analysis.aggregates.codeLines === 'number' && analysis.aggregates.codeLines > 0, `Aggregated LOC > 0 (got ${analysis.aggregates.codeLines})`);
    assert(typeof analysis.aggregates.maxComplexity === 'number' && analysis.aggregates.maxComplexity >= 1, `Max complexity >= 1 (got ${analysis.aggregates.maxComplexity})`);
    assert(typeof analysis.aggregates.averageComplexity === 'number', 'Aggregates contain averageComplexity');

    console.log(`  ${YELLOW('ℹ')} Scanned ${analysis.aggregates.fileCount} files, ${analysis.aggregates.codeLines} LOC, max complexity=${analysis.aggregates.maxComplexity}`);

    // Top 3 most complex files
    const top3 = [...analysis.files].sort((a, b) => b.complexity - a.complexity).slice(0, 3);
    console.log(`  ${YELLOW('ℹ')} Top complex files:`);
    top3.forEach(f => console.log(`       ${f.filename}: complexity=${f.complexity}, LOC=${f.codeLines}`));
  } catch (err) {
    console.log(`  ${RED('✘')} Repository analysis failed: ${err.message}`);
    failed += 7;
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

if (process.argv[1].endsWith('test_agent3.mjs')) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0)).catch(console.error);
}
