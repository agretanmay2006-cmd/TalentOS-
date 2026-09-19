import { getGeminiClient } from '../config/gemini.js';
import { getSession } from '../config/neo4j.js';
import neo4jService from './neo4jService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Downloads a pitch deck PDF file from a URL.
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
export const downloadPitchDeck = async (url) => {
  try {
    console.log(`[Agent 2] Downloading pitch deck from: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error downloading pitch deck: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[Agent 2] Download failed: ${error.message}`);
    throw error;
  }
};

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true';

/**
 * Invokes Gemini Multimodal VLM to evaluate a pitch deck presentation
 * @param {Buffer} fileBuffer PDF pitch deck
 * @param {string} mimeType 
 * @returns {Promise<object>} Grading results
 */
export const gradePitchDeckWithVLM = async (fileBuffer, mimeType = 'application/pdf') => {
  const ai = getGeminiClient();
  if (!ai || !fileBuffer) {
    if (IS_PRODUCTION) {
      throw new Error('[Agent 2] Live Gemini VLM client and valid pitch deck file buffer are required in production mode.');
    }
    console.warn('[Agent 2] Running mock grading logic.');
    // Simulated grading fallback
    return {
      clarity: Math.floor(Math.random() * 3) + 7,     // 7 to 9
      viability: Math.floor(Math.random() * 4) + 6,   // 6 to 9
      technical: Math.floor(Math.random() * 3) + 8,   // 8 to 10
      business: Math.floor(Math.random() * 4) + 6,    // 6 to 9
      feedback: 'This is a simulated pitch deck review. The presentation demonstrates a strong technological foundation, but should elaborate more on the exact go-to-market strategies and unit economics.'
    };
  }

  try {
    console.log('[Agent 2] Sending pitch deck to Gemini Flash VLM...');
    
    const promptText = `
      You are an expert venture capitalist and technical auditor. 
      Analyze this pitch deck PDF presentation and grade it on a scale of 1 to 10 for the following criteria:
      1. Clarity: How clearly is the problem, solution, and value proposition explained?
      2. Viability: Is there a large market size, clear target audience, and solid product-market fit?
      3. Technical: How feasible, innovative, and robust is the technical architecture?
      4. Business: Is there a solid revenue model, go-to-market plan, and commercial scaling vision?
      
      Provide a concise paragraph of constructive qualitative feedback.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType
          }
        },
        promptText
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            clarity: { type: 'INTEGER', description: 'Score out of 10' },
            viability: { type: 'INTEGER', description: 'Score out of 10' },
            technical: { type: 'INTEGER', description: 'Score out of 10' },
            business: { type: 'INTEGER', description: 'Score out of 10' },
            feedback: { type: 'STRING', description: 'Qualitative analysis and suggestions' }
          },
          required: ['clarity', 'viability', 'technical', 'business', 'feedback']
        }
      }
    });

    const parsedResults = JSON.parse(response.text);
    console.log('[Agent 2] VLM Grading successfully completed.');
    return parsedResults;
  } catch (error) {
    console.error('[Agent 2] VLM grading failed:', error.message);
    throw error;
  }
};

/**
 * Updates Project node in Neo4j with scores and links it to candidate
 */
export const updateProjectGrades = async (projectId, projectName, email, grades) => {
  const session = getSession();
  try {
    const totalScore = (grades.clarity + grades.viability + grades.technical + grades.business) / 4;
    
    console.log(`[Agent 2] Saving grades in Neo4j for Project: "${projectName}" (ID: ${projectId})`);
    
    // Ensure Candidate and Project nodes exist, then create WORKED_ON relationship and set pitch metrics
    const result = await session.run(
      `MATCH (c:Candidate {email: $email})
       MERGE (p:Project {id: $projectId})
       ON CREATE SET p.name = $projectName, p.createdAt = datetime()
       MERGE (c)-[r:WORKED_ON]->(p)
       SET p.pitchClarity = $clarity,
           p.pitchViability = $viability,
           p.pitchTechnical = $technical,
           p.pitchBusiness = $business,
           p.pitchTotal = $totalScore,
           p.pitchFeedback = $feedback,
           p.gradedAt = datetime()
       RETURN p`,
      {
        email,
        projectId,
        projectName,
        clarity: grades.clarity,
        viability: grades.viability,
        technical: grades.technical,
        business: grades.business,
        totalScore,
        feedback: grades.feedback
      }
    );
    
    return result.records.length > 0;
  } catch (error) {
    console.error('[Agent 2] Failed to save grades in Neo4j:', error.message);
    return false;
  } finally {
    await session.close();
  }
};

/**
 * Processes a Devpost webhook submission payload
 * @param {object} payload 
 * @param {object} io Socket.io instance for live reporting
 */
export const processDevpostSubmission = async (payload, io = null) => {
  const {
    submission_id,
    project_title,
    pitch_deck_url,
    submitter_name,
    submitter_email,
    skills_used = []
  } = payload;

  const emitLog = (step, status, details = '') => {
    if (io) {
      io.emit('ingest-status', { step: `[Agent 2] ${step}`, status, details });
    }
    console.log(`[Agent 2] [${status.toUpperCase()}] ${step}: ${details}`);
  };

  emitLog('Devpost Submissions Webhook', 'running', `Processing "${project_title}" from ${submitter_name}`);

  try {
    // 1. Ensure Candidate exists in Neo4j
    emitLog('Neo4j Candidate Registry', 'running', `Registering Submitter: ${submitter_name} (${submitter_email})`);
    await neo4jService.createCandidate(submitter_email, submitter_name, submitter_email);
    
    // Index skills if provided
    for (const skill of skills_used) {
      await neo4jService.createSkill(skill, 'Hackathon');
      await neo4jService.linkCandidateSkill(submitter_email, skill, 'Contributor');
    }
    emitLog('Neo4j Candidate Registry', 'success', `Candidate linked with ${skills_used.length} skills.`);

    // 2. Download and grade pitch deck
    let grades;
    if (pitch_deck_url && pitch_deck_url.startsWith('http')) {
      emitLog('VLM Pitch Grading', 'running', `Downloading presentation...`);
      try {
        const fileBuffer = await downloadPitchDeck(pitch_deck_url);
        emitLog('VLM Pitch Grading', 'running', `Analyzing slides with Gemini Flash...`);
        grades = await gradePitchDeckWithVLM(fileBuffer);
      } catch (e) {
        emitLog('VLM Pitch Grading', 'warning', `Download or API failed. Defaulting to mock grades: ${e.message}`);
        grades = await gradePitchDeckWithVLM(null); // Triggers mock fallback
      }
    } else {
      emitLog('VLM Pitch Grading', 'warning', 'No valid pitch deck URL provided. Running mock grading.');
      grades = await gradePitchDeckWithVLM(null);
    }

    emitLog('VLM Pitch Grading', 'success', `Score: Clarity ${grades.clarity}/10, Tech ${grades.technical}/10`);

    // 3. Save grades to Neo4j
    const projectId = `devpost_${submission_id || Date.now()}`;
    emitLog('Save Pitch Report', 'running', `Writing grades to Neo4j...`);
    const saved = await updateProjectGrades(projectId, project_title, submitter_email, grades);
    
    if (saved) {
      emitLog('Save Pitch Report', 'success', `Project graded and linked successfully.`);
    } else {
      emitLog('Save Pitch Report', 'failed', `Failed to update project node.`);
    }

    return {
      success: true,
      projectId,
      grades
    };
  } catch (error) {
    emitLog('Devpost Submissions Webhook', 'failed', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  downloadPitchDeck,
  gradePitchDeckWithVLM,
  updateProjectGrades,
  processDevpostSubmission
};
