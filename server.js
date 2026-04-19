const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ── LowDB Setup ──────────────────────────────────────────────────
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db = low(adapter);
db.defaults({ incidents: [], deployments: [] }).write();

// ── Ollama / AI Triage Setup ─────────────────────────────────────
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  fetch = null;
}
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';
const OLLAMA_MODEL_PRIORITY = ['llama3.2', 'llama3.1', 'llama3', 'llama2', 'mistral', 'gemma2', 'phi3'];
let ollamaModel = null; // Will be auto-detected

// ── Static Files from public/ ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── Route Mapping ────────────────────────────────────────────────
app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/disaster',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'disaster.html')));
app.get('/emergency', (req, res) => res.sendFile(path.join(__dirname, 'public', 'emergency.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/confirm',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'confirm.html')));
app.get('/responder', (req, res) => res.sendFile(path.join(__dirname, 'public', 'responder.html')));
app.get('/resource',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'resource.html')));



// ── REST API: Get all incidents ──────────────────────────────────
app.get('/api/incidents', (req, res) => {
  res.json(db.get('incidents').value());
});

// ── AI Triage Functions ──────────────────────────────────────────

/**
 * Keyword-based fallback triage when Ollama is unavailable
 */
function keywordTriage(data) {
  const sub = (data.subtype || '').toUpperCase();
  const notes = (data.notes || '').toLowerCase();

  // Explicit severity mapping per subtype
  const subtypeSeverity = {
    // Disaster subtypes
    FLOOD:       'URGENT',
    EARTHQUAKE:  'CRITICAL',
    FIRE:        'CRITICAL',
    COLLAPSE:    'CRITICAL',
    STORM:       'URGENT',
    GAS:         'CRITICAL',
    // Emergency subtypes
    MEDICAL:     'CRITICAL',
    ACCIDENT:    'URGENT',
    INJURY:      'URGENT',
    TRAPPED:     'CRITICAL',
    UNCONSCIOUS: 'CRITICAL',
    PREGNANCY:   'CRITICAL'
  };

  // Notes-based escalation keywords
  const criticalKeywords = ['unconscious', 'not breathing', 'cardiac', 'dying', 'severe', 'massive', 'crushed', 'buried', 'explosion'];
  const hasNoteCritical = criticalKeywords.some(kw => notes.includes(kw));

  const reasonMap = {
    FLOOD:       'Active flood reported — water rescue may be needed.',
    EARTHQUAKE:  'Seismic event — structural collapse risk, search & rescue priority.',
    FIRE:        'Active fire — immediate evacuation and firefighting required.',
    COLLAPSE:    'Structural collapse — trapped victims possible, heavy rescue needed.',
    STORM:       'Severe weather event — shelter-in-place advisory.',
    GAS:         'Hazardous material detected — HAZMAT protocols activated.',
    MEDICAL:     'Medical emergency — cardiac/respiratory assessment needed.',
    ACCIDENT:    'Road accident — trauma team on standby.',
    INJURY:      'Active bleeding/injury — apply direct pressure, ambulance en route.',
    TRAPPED:     'Person trapped — search & rescue team deployment.',
    UNCONSCIOUS: 'Unconscious patient — airway management critical.',
    PREGNANCY:   'Obstetric emergency — OB/GYN team on alert.'
  };

  // Start with subtype severity, default to URGENT for unknown
  let level = subtypeSeverity[sub] || 'URGENT';

  // Escalate to CRITICAL if notes contain critical keywords
  if (hasNoteCritical && level !== 'CRITICAL') level = 'CRITICAL';

  return {
    level: level,
    reason: reasonMap[sub] || `${data.type} SOS — ${sub || 'general'} emergency reported. Dispatching nearest unit.`,
    source: 'keyword-engine'
  };
}

/**
 * AI Triage via Ollama (auto-detects available model)
 */
async function aiTriage(data) {
  if (!fetch) return keywordTriage(data);

  // Auto-detect Ollama model on first call
  if (!ollamaModel) {
    try {
      const tagsRes = await fetch(OLLAMA_TAGS_URL, { timeout: 3000 });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        const available = (tagsData.models || []).map(m => m.name.split(':')[0]);
        ollamaModel = OLLAMA_MODEL_PRIORITY.find(m => available.includes(m));
        if (ollamaModel) {
          console.log(`🧠 Ollama: Using model "${ollamaModel}" (detected from ${available.length} available)`);
        } else if (available.length > 0) {
          ollamaModel = available[0]; // Use whatever is available
          console.log(`🧠 Ollama: Using first available model "${ollamaModel}"`);
        } else {
          console.log('⚠️  Ollama: No models installed. Using keyword triage.');
          ollamaModel = '__none__';
        }
      }
    } catch (e) {
      console.log('⚠️  Ollama not reachable. Using keyword triage.');
      ollamaModel = '__none__';
    }
  }

  if (ollamaModel === '__none__') return keywordTriage(data);

  let prompt;
  if (data.type === 'DISASTER') {
    prompt = `You are an emergency triage AI. A disaster SOS has been received.
Type: DISASTER
Subtype: ${data.subtype}
Notes: ${data.notes || 'None provided'}
GPS: ${data.lat}, ${data.lon}

Analyze this incident. Determine the scale (Individual, Locality, or City-wide) and the evacuation priority level (CRITICAL, URGENT, or STABLE).
Respond with ONLY a JSON object, no other text (do not use markdown). Format exactly as:
{"scale": "Individual/Locality/City-wide", "level": "CRITICAL" or "URGENT" or "STABLE", "reason": "one sentence explanation"}`;
  } else {
    prompt = `You are an emergency triage AI. A medical/personal emergency SOS has been received.
Type: EMERGENCY
Subtype: ${data.subtype}
Notes: ${data.notes || 'None provided'}
GPS: ${data.lat}, ${data.lon}

Analyze this incident. Extract any danger keywords and determine the triage level (CRITICAL, URGENT, or STABLE).
Respond with ONLY a JSON object, no other text (do not use markdown). Format exactly as:
{"keywords": ["keyword1", "keyword2"], "level": "CRITICAL" or "URGENT" or "STABLE", "reason": "one sentence explanation"}`;
  }

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 100 }
      }),
      timeout: 8000
    });

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

    const result = await response.json();
    const text = result.response || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.level && parsed.reason) {
        // Validate level
        const validLevels = ['CRITICAL', 'URGENT', 'STABLE'];
        parsed.level = validLevels.includes(parsed.level.toUpperCase())
          ? parsed.level.toUpperCase()
          : 'URGENT';
        parsed.source = 'llama3-ai';
        return parsed;
      }
    }

    // If parsing fails, fallback
    console.log('⚠️  AI response unparseable, using keyword fallback');
    return keywordTriage(data);

  } catch (err) {
    console.log(`⚠️  Ollama unreachable (${err.message}), using keyword triage`);
    return keywordTriage(data);
  }
}

// ── Hospital & ETA Database ──────────────────────────────────────
let icuBeds = 42;

const hospitals = {
  DISASTER: [
    { name: 'City Disaster Relief Center', eta: '6 Minutes' },
    { name: 'Regional Emergency Hub', eta: '8 Minutes' },
    { name: 'National Guard Field Station', eta: '12 Minutes' }
  ],
  EMERGENCY: [
    { name: 'City Central Hospital — Trauma', eta: '4 Minutes' },
    { name: 'Apollo Emergency Ward', eta: '5 Minutes' },
    { name: 'Sahyadri Super Speciality', eta: '7 Minutes' }
  ]
};

function getHospitalForType(type) {
  const list = hospitals[type] || hospitals.EMERGENCY;
  return list[Math.floor(Math.random() * list.length)];
}

// ── Ambulance Simulation (Disabled in Phase 2) ──
// Ambulance coordinates are now driven directly by the responder terminal using real GPS

// ── Socket.io Event Handling ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  // ── 1. SOS Incoming ─────────────────────────────────────────
  socket.on('send_sos', async (data) => {
    console.log('🚨 SOS INCOMING:', data);

    // Assign unique ID
    const id = uuidv4().slice(0, 8).toUpperCase();
    data.id = id;

    // AI Triage
    const triage = await aiTriage(data);
    data.triage = triage;

    console.log(`🧠 AI Triage [${id}]: ${triage.level} — ${triage.reason} (via ${triage.source})`);

    // Store in LowDB
    db.get('incidents').push({
      ...data,
      receivedAt: new Date().toISOString(),
      status: 'ACTIVE'
    }).write();

    // Broadcast enriched data to all dashboards
    io.emit('new_sos_alert', data);
  });

  // ── 2. Deploy Unit ──────────────────────────────────────────
  socket.on('deploy_unit', (data) => {
    console.log('🚑 Dispatching rescue unit:', data);

    const type = data.sosType || 'EMERGENCY';
    const hospital = getHospitalForType(type);

    // Notify victim
    io.emit('help_is_coming', {
      eta: hospital.eta,
      hospital: hospital.name,
      sosId: data.sosId
    });

    // Push mission data to responder
    io.emit('dispatch_assignment', {
      gps: data.targetGps,
      vitals: {
        blood: 'O-',
        trauma: 'Priority Alpha',
        hr: '135 BPM'
      },
      sosId: data.sosId,
      hospital: hospital.name
    });

    // Update ICU capacity
    if (icuBeds > 0) icuBeds--;
    io.emit('update_hospital_capacity', { beds: icuBeds });

    // Store deployment
    db.get('deployments').push({
      sosId: data.sosId,
      targetGps: data.targetGps,
      hospital: hospital.name,
      eta: hospital.eta,
      deployedAt: new Date().toISOString()
    }).write();

    // Update incident status
    const incident = db.get('incidents').find({ id: data.sosId });
    if (incident.value()) {
      incident.assign({ status: 'DEPLOYED' }).write();
    }

    console.log(`✅ Unit deployed to ${data.sosId} → ${hospital.name} (ETA: ${hospital.eta})`);
  });

  // ── 3. Responder GPS Tracking ───────────────────────────────
  socket.on('responder_gps', (data) => {
    // Forward real responder GPS to all dashboards
    io.emit('ambulance_position', {
      lat: data.lat,
      lon: data.lon,
      arrived: false
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// ── Server Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     🚨 ONCLICK — Emergency SOS System        ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  🌐 App:        http://localhost:${PORT}          ║`);
  console.log(`║  📊 Dashboard:  http://localhost:${PORT}/dashboard ║`);
  console.log(`║  🚑 Responder:  http://localhost:${PORT}/responder ║`);
  console.log(`║  📦 API:        http://localhost:${PORT}/api/incidents ║`);
  console.log('╠═══════════════════════════════════════════════╣');
  console.log('║  🧠 AI Triage:  Ollama + Keyword Fallback    ║');
  console.log('║  💾 Persistence: LowDB (data/db.json)        ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
});
