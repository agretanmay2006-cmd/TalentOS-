const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { linkCandidateProject } = require('../db/neo4j');

/**
 * Calculates Lines of Code (Total, Blank, Comment, Code).
 * Returns:
 *   - `total`      — total line count (canonical property)
 *   - `totalLines` — alias for `total` for backward-compatible callers
 *   - `code`       — executable code lines
 *   - `comment`    — comment lines
 *   - `blank`      — blank/whitespace-only lines
 */
function analyzeLOC(codeString) {
  const lines = codeString.split(/\r?\n/);
  let blank = 0;
  let comment = 0;
  let code = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blank++;
      continue;
    }
    if (inBlockComment) {
      comment++;
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      comment++;
      if (!trimmed.includes('*/')) inBlockComment = true;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      comment++;
      continue;
    }
    code++;
  }

  const total = lines.length;
  // `totalLines` is a back-compatible alias — both properties are always present
  return { total, totalLines: total, code, comment, blank };
}

/**
 * AST & Pattern-based Cyclomatic Complexity calculation.
 * Counts control flow branching points (if, else if, for, while, case, catch, &&, ||, ?, etc.)
 */
function calculateCyclomaticComplexity(codeString) {
  let complexity = 1; // base complexity

  // Pattern matching branching keywords
  const branchPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+[^:]+:/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?\s*[^:]+:/g // ternary
  ];

  for (const pattern of branchPatterns) {
    const matches = codeString.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Computes Jaccard n-gram similarity between two code files (multi-file plagiarism detector).
 */
function computeFileSimilarity(code1, code2, ngramSize = 4) {
  const tokenize = (str) =>
    str.replace(/[^\w]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 1);

  const tokens1 = tokenize(code1);
  const tokens2 = tokenize(code2);

  if (tokens1.length < ngramSize || tokens2.length < ngramSize) return 0;

  const getNgrams = (tokens) => {
    const set = new Set();
    for (let i = 0; i <= tokens.length - ngramSize; i++) {
      set.add(tokens.slice(i, i + ngramSize).join(' '));
    }
    return set;
  };

  const set1 = getNgrams(tokens1);
  const set2 = getNgrams(tokens2);

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : Number((intersection / union).toFixed(4));
}

/**
 * Analyzes a collection of project files and generates a complete Code Intel Audit Report.
 * @param {Array<{path: string, content: string}>} files
 * @param {Object} candidateData - { email, name, projectId, repoUrl }
 */
async function auditProjectCode(files, candidateData = {}) {
  let totalLines = 0;
  let totalCodeLines = 0;
  let totalComplexity = 0;
  const fileAudits = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const loc = analyzeLOC(file.content);
    const complexity = calculateCyclomaticComplexity(file.content);

    totalLines += loc.total;
    totalCodeLines += loc.code;
    totalComplexity += complexity;

    fileAudits.push({
      filePath: file.path,
      loc,
      cyclomaticComplexity: complexity,
      sha256: crypto.createHash('sha256').update(file.content).digest('hex')
    });
  }

  // Cross-file similarity analysis within the project
  let maxSimilarity = 0;
  const pairwiseSimilarity = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const sim = computeFileSimilarity(files[i].content, files[j].content);
      if (sim > maxSimilarity) maxSimilarity = sim;
      if (sim > 0.3) {
        pairwiseSimilarity.push({
          fileA: files[i].path,
          fileB: files[j].path,
          similarity: sim
        });
      }
    }
  }

  const avgComplexityPerFile = files.length > 0 ? Number((totalComplexity / files.length).toFixed(2)) : 0;
  const codeQualityScore = Math.max(0, Math.min(100, Math.round(100 - (avgComplexityPerFile * 3) - (maxSimilarity * 30))));

  const report = {
    projectId: candidateData.projectId || `proj_${Date.now()}`,
    repoUrl: candidateData.repoUrl || '',
    filesAnalyzedCount: files.length,
    totalLines,
    totalCodeLines,
    totalComplexity,
    avgComplexityPerFile,
    maxMultiFileSimilarityPercentage: Number((maxSimilarity * 100).toFixed(2)),
    duplicatedFilePairs: pairwiseSimilarity,
    codeQualityScore,
    fileDetails: fileAudits,
    auditedAt: new Date().toISOString()
  };

  // Link into Neo4j graph
  if (candidateData.email) {
    await linkCandidateProject(
      { email: candidateData.email, name: candidateData.name },
      {
        projectId: report.projectId,
        title: candidateData.title || path.basename(candidateData.repoUrl || 'Repository'),
        repoUrl: candidateData.repoUrl,
        vlmScore: codeQualityScore,
        commitCount: files.length
      }
    );
  }

  return report;
}

module.exports = {
  analyzeLOC,
  calculateCyclomaticComplexity,
  computeFileSimilarity,
  auditProjectCode
};
