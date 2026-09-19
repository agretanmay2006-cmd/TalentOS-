import fs from 'fs';
import path from 'path';
import { getSession } from '../config/neo4j.js';

/**
 * Normalizes extension to language identifier
 */
const getLanguage = (ext) => {
  switch (ext.toLowerCase()) {
    case '.js':
    case '.jsx': return 'JavaScript';
    case '.ts':
    case '.tsx': return 'TypeScript';
    case '.py': return 'Python';
    case '.go': return 'Go';
    default: return null;
  }
};

/**
 * Analyzes a single file's content for LOC, comments, and cyclomatic complexity approximation.
 * @param {string} filePath 
 * @returns {object} File metrics
 */
export const analyzeFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const language = getLanguage(ext);
  
  if (!language) return null;

  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;
  
  let blankLines = 0;
  let commentLines = 0;
  let complexity = 1; // Base cyclomatic complexity

  let inBlockComment = false;

  // Regex patterns for control statements
  // Counts if, for, while, switch cases, catch, conditional logical operators (&&, ||, and, or)
  const jsControlKeywords = /\b(if|for|while|catch|case|else\s+if)\b|(\&\&|\|\|)/g;
  const pyControlKeywords = /\b(if|elif|for|while|except)\b|(\band\b|\bor\b)/g;
  const goControlKeywords = /\b(if|for|select|case|defer)\b|(\&\&|\|\|)/g;

  lines.forEach(line => {
    const trimmed = line.trim();
    
    // 1. Count blank lines
    if (trimmed === '') {
      blankLines++;
      return;
    }

    // 2. Count comments
    if (language === 'JavaScript' || language === 'TypeScript' || language === 'Go') {
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) inBlockComment = false;
        return;
      }
      if (trimmed.startsWith('/*')) {
        commentLines++;
        if (!trimmed.includes('*/')) inBlockComment = true;
        return;
      }
      if (trimmed.startsWith('//')) {
        commentLines++;
        return;
      }
    } else if (language === 'Python') {
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('"""') || trimmed.includes("'''")) inBlockComment = false;
        return;
      }
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        commentLines++;
        if (!(trimmed.endsWith('"""') || trimmed.endsWith("'''")) || trimmed.length === 3) {
          inBlockComment = true;
        }
        return;
      }
      if (trimmed.startsWith('#')) {
        commentLines++;
        return;
      }
    }

    // 3. Compute complexity metrics
    let matches = null;
    if (language === 'JavaScript' || language === 'TypeScript') {
      matches = trimmed.match(jsControlKeywords);
    } else if (language === 'Python') {
      matches = trimmed.match(pyControlKeywords);
    } else if (language === 'Go') {
      matches = trimmed.match(goControlKeywords);
    }

    if (matches) {
      complexity += matches.length;
    }
  });

  const codeLines = totalLines - blankLines - commentLines;

  return {
    filename: path.basename(filePath),
    path: filePath,
    language,
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    complexity
  };
};

/**
 * Traverses a repository directory and gathers metrics for all code files recursively.
 * @param {string} dirPath 
 * @param {string[]} ignoreDirs Directories to skip (e.g. node_modules, .git)
 */
export const analyzeRepository = (dirPath, ignoreDirs = ['node_modules', '.git', 'dist', 'build']) => {
  const fileList = [];

  const traverse = (currentPath) => {
    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (e) {
      console.warn(`[Agent 3] Skip reading directory: ${currentPath} (${e.message})`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        if (ignoreDirs.includes(entry.name)) continue;
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (getLanguage(ext)) {
          const metrics = analyzeFile(fullPath);
          if (metrics) fileList.push(metrics);
        }
      }
    }
  };

  traverse(dirPath);

  // Compute aggregate statistics
  let totalLOC = 0;
  let totalComplexity = 0;
  let totalComments = 0;
  let maxComplexity = 0;

  fileList.forEach(f => {
    totalLOC += f.codeLines;
    totalComplexity += f.complexity;
    totalComments += f.commentLines;
    if (f.complexity > maxComplexity) maxComplexity = f.complexity;
  });

  return {
    files: fileList,
    aggregates: {
      fileCount: fileList.length,
      codeLines: totalLOC,
      commentLines: totalComments,
      totalComplexity,
      maxComplexity,
      averageComplexity: fileList.length > 0 ? Number((totalComplexity / fileList.length).toFixed(2)) : 0
    }
  };
};

/**
 * Writes Repository and file intelligence metrics directly to Neo4j
 */
export const saveRepositoryMetricsToNeo4j = async (projectId, projectName, email, analysis) => {
  const session = getSession();
  try {
    console.log(`[Agent 3] Saving code intelligence metrics to Neo4j for project: ${projectName}`);
    
    // 1. Create or match the project and write aggregate metrics
    await session.run(
      `MERGE (p:Project {id: $projectId})
       SET p.name = $projectName,
           p.totalLOC = $codeLines,
           p.fileCount = $fileCount,
           p.maxComplexity = $maxComplexity,
           p.avgComplexity = $averageComplexity,
           p.lastAnalyzed = datetime()
       RETURN p`,
      {
        projectId,
        projectName,
        ...analysis.aggregates
      }
    );

    // 2. Link Candidate as contributor
    await session.run(
      `MATCH (c:Candidate {email: $email})
       MATCH (p:Project {id: $projectId})
       MERGE (c)-[r:WORKED_ON]->(p)
       SET r.contributionLOC = $codeLines,
           r.role = 'Core Developer',
           r.lastContributed = datetime()
       RETURN r`,
      { email, projectId, codeLines: analysis.aggregates.codeLines }
    );

    // 3. Create file nodes and link to project
    // To avoid overloading Cypher transaction, batch creation of files
    for (const file of analysis.files) {
      // Create relative path for clean visualization
      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');
      
      await session.run(
        `MATCH (p:Project {id: $projectId})
         MERGE (f:File {path: $path})
         SET f.name = $filename,
             f.language = $language,
             f.loc = $codeLines,
             f.comments = $commentLines,
             f.complexity = $complexity
         MERGE (p)-[:CONTAINS_FILE]->(f)
         RETURN f`,
        {
          projectId,
          path: relativePath,
          filename: file.filename,
          language: file.language,
          codeLines: file.codeLines,
          commentLines: file.commentLines,
          complexity: file.complexity
        }
      );
    }

    console.log(`[Agent 3] Code structure indexed inside Neo4j graph successfully.`);
    return true;
  } catch (error) {
    console.error('[Agent 3] Failed to write repository metrics to Neo4j:', error.message);
    return false;
  } finally {
    await session.close();
  }
};

export default {
  analyzeFile,
  analyzeRepository,
  saveRepositoryMetricsToNeo4j
};
