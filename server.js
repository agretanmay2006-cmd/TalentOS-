const express = require('express');
let cron; try { cron = require('node-cron'); } catch(e) { cron = null; }
let PDFDocument; try { PDFDocument = require('pdfkit'); } catch(e) { PDFDocument = null; }
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

const initialHospitals = [
  { id: 'H1', name: 'Apollo Emergency Ward', lat: 18.5204, lon: 73.8567, beds: { ICU: 4, General: 20, Ventilator: 2, Emergency: 5, Pediatric: 3 }, doctors: { Cardiologist: 1, Neurologist: 0, Trauma: 2, 'General Physician': 4, 'Emergency Specialist': 3 } },
  { id: 'H2', name: 'City Central Hospital — Trauma', lat: 18.5304, lon: 73.8667, beds: { ICU: 2, General: 15, Ventilator: 1, Emergency: 8, Pediatric: 1 }, doctors: { Cardiologist: 0, Neurologist: 1, Trauma: 3, 'General Physician': 2, 'Emergency Specialist': 2 } },
  { id: 'H3', name: 'Sahyadri Super Speciality', lat: 18.5104, lon: 73.8467, beds: { ICU: 6, General: 30, Ventilator: 4, Emergency: 10, Pediatric: 5 }, doctors: { Cardiologist: 2, Neurologist: 2, Trauma: 1, 'General Physician': 5, 'Emergency Specialist': 4 } }
];

db.defaults({ incidents: [], deployments: [], hospitals: initialHospitals, specialistAlerts: [], anomalies: [], forecast: [], massCasualtyEvents: [] }).write();
if (!db.has('hospitals').value() || db.get('hospitals').value().length === 0) {
  db.set('hospitals', initialHospitals).write();
}
// Migrate hospitals to v4 schema
db.get('hospitals').value().forEach((h, i) => {
  const defaults = { capabilities:{cathLab:false,mri:false,ct:true,nicu:false,burnsUnit:false,dialysis:false,ventilators:0,traumaCenter:false}, equipment_status:{ct:'available'}, bloodBank:{'A+':0,'A-':0,'B+':0,'B-':0,'AB+':0,'AB-':0,'O+':0,'O-':0}, qualityScore:{cardiac:0.7,trauma:0.7,neuro:0.7,burns:0.7,overall:0.7} };
  ['capabilities','equipment_status','bloodBank','qualityScore'].forEach(k => { if (!h[k]) db.get('hospitals').nth(i).assign({[k]: defaults[k]}).write(); });
});

// ── Ollama / AI Triage Setup ─────────────────────────────────────
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  fetch = null;
}
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';
const OLLAMA_MODEL_PRIORITY = ['llama3.2', 'llama3.1', 'llama3', 'llama2', 'mistral', 'gemma2', 'phi3', 'tinyllama', 'qwen2:0.5b'];
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



// ── REST API: Get all data ──────────────────────────────────
app.get('/api/incidents', (req, res) => res.json(db.get('incidents').value()));
app.get('/api/hospitals', (req, res) => res.json(db.get('hospitals').value()));
app.post('/api/book-bed', (req, res) => res.json({ success: true }));
app.post('/api/assign-doctor', (req, res) => res.json({ success: true }));
app.get('/hospital-admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'hospital-admin.html')));
app.get('/analytics',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'analytics.html')));
app.get('/vitals',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'vitals.html')));

// ── New React Admin Dashboard (ONCLICK) ─────────────────────────
app.use('/admin-dashboard', express.static(path.join(__dirname, 'public', 'admin-dashboard')));
app.get('/admin-dashboard/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard', 'index.html'));
});
// Load v4 routes
try { require('./routes-v4')(app, io, db, fetch, () => ollamaModel, PDFDocument); } catch(e) { console.log('routes-v4 load error:', e.message); }

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

  const requirements = {
    FLOOD:       { bed: 'Emergency', doc: 'Emergency Specialist', firstAid: 'Move to higher ground immediately. Do not walk through moving water.' },
    EARTHQUAKE:  { bed: 'Emergency', doc: 'Trauma', firstAid: 'Drop, cover, and hold on. Beware of aftershocks.' },
    FIRE:        { bed: 'Ventilator', doc: 'Emergency Specialist', firstAid: 'Stay low to the floor to avoid smoke. Cover mouth with wet cloth.' },
    COLLAPSE:    { bed: 'ICU', doc: 'Trauma', firstAid: 'Do not move heavy debris from victims unless life-threatening. Protect head.' },
    STORM:       { bed: 'General', doc: 'General Physician', firstAid: 'Stay indoors away from windows. Avoid electrical equipment.' },
    GAS:         { bed: 'Ventilator', doc: 'Emergency Specialist', firstAid: 'Evacuate immediately upwind. Do not use electrical switches.' },
    MEDICAL:     { bed: 'ICU', doc: 'Cardiologist', firstAid: 'Have patient sit and rest. Loosen tight clothing. Prepare for CPR if breathing stops.' },
    ACCIDENT:    { bed: 'ICU', doc: 'Trauma', firstAid: 'Do not move the victim unless in immediate danger. Support head and neck.' },
    INJURY:      { bed: 'Emergency', doc: 'Trauma', firstAid: 'Apply firm, direct pressure to the wound with a clean cloth.' },
    TRAPPED:     { bed: 'Emergency', doc: 'Trauma', firstAid: 'Keep calm and conserve energy. Knock on pipes or walls periodically.' },
    UNCONSCIOUS: { bed: 'ICU', doc: 'Neurologist', firstAid: 'Check breathing. If breathing, place in recovery position. If not, start CPR.' },
    PREGNANCY:   { bed: 'Emergency', doc: 'Emergency Specialist', firstAid: 'Have patient lie on their left side. Keep them warm and calm.' }
  };

  // Start with subtype severity, default to URGENT for unknown
  let level = subtypeSeverity[sub] || 'URGENT';
  let reqs = requirements[sub] || { bed: 'General', doc: 'General Physician', firstAid: 'Stay calm and wait for emergency responders.' };

  // Escalate to CRITICAL if notes contain critical keywords
  if (hasNoteCritical && level !== 'CRITICAL') level = 'CRITICAL';

  return {
    level: level,
    reason: reasonMap[sub] || `${data.type} SOS — ${sub || 'general'} emergency reported.`,
    requiredBed: reqs.bed,
    requiredDoctor: reqs.doc,
    firstAid: reqs.firstAid,
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
        parsed.source = `${ollamaModel}-ai`;

        const fallback = keywordTriage(data);
        parsed.requiredBed = fallback.requiredBed;
        parsed.requiredDoctor = fallback.requiredDoctor;
        parsed.firstAid = fallback.firstAid;

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

// ── Hospital Matching & Haversine ────────────────────────────────
function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function findOptimalHospitals(lat, lon, reqBed, reqDoc) {
  const hospitals = db.get('hospitals').value() || [];
  
  const scored = hospitals.map(h => {
    const dist = haversineDist(lat, lon, h.lat, h.lon);
    const hasBed = h.beds[reqBed] > 0;
    const hasDoc = h.doctors[reqDoc] > 0;
    const etaMins = Math.round(dist * 1.5 + 3);
    return { ...h, dist, etaMins, hasBed, hasDoc };
  });

  return scored.sort((a, b) => a.dist - b.dist);
}

function autoReserve(hospitalId, reqBed, reqDoc) {
  const hospitals = db.get('hospitals').value();
  const idx = hospitals.findIndex(h => h.id === hospitalId);
  if (idx !== -1) {
    if (hospitals[idx].beds[reqBed] > 0) hospitals[idx].beds[reqBed]--;
    if (hospitals[idx].doctors[reqDoc] > 0) hospitals[idx].doctors[reqDoc]--;
    db.set('hospitals', hospitals).write();
    io.emit('hospitals_updated', hospitals);
    return hospitals[idx];
  }
  return null;
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
    const optimalHospitals = findOptimalHospitals(data.lat, data.lon, triage.requiredBed, triage.requiredDoctor);
    
    if (triage.level === 'CRITICAL' && optimalHospitals.length > 0) {
      let best = optimalHospitals.find(h => h.hasBed && h.hasDoc) || optimalHospitals[0];
      
      const reserved = autoReserve(best.id, triage.requiredBed, triage.requiredDoctor);
      data.autoReserved = {
        hospital: reserved,
        eta: best.etaMins + ' Minutes',
        bed: triage.requiredBed,
        doctor: triage.requiredDoctor
      };
      io.emit('pre_alert_generated', { ...data, optimalHospitals });
      io.emit('bed_booked_notif', { hospitalId: best.id, incidentId: data.id, bed: triage.requiredBed });
    }

    data.optimalHospitals = optimalHospitals;
    io.emit('new_sos_alert', data);

    // ── Phase 5: Mass Casualty Detection ───────────────────────
    const now = Date.now();
    const radius = 0.005; // ~500m in degrees
    const window10 = 600000; // 10 minutes
    const allInc = db.get('incidents').value();
    const nearby = allInc.filter(inc => {
      if (!inc.lat || !inc.lon) return false;
      const age = now - new Date(inc.receivedAt || inc.timestamp).getTime();
      const dist = Math.abs(inc.lat - data.lat) < radius && Math.abs(inc.lon - data.lon) < radius;
      return age < window10 && dist;
    });
    if (nearby.length >= 5) {
      const event = { detectedAt: new Date().toISOString(), count: nearby.length, center: { lat: data.lat, lon: data.lon }, ids: nearby.map(i => i.id) };
      db.get('massCasualtyEvents').push(event).write();
      nearby.forEach(inc => { db.get('incidents').find({ id: inc.id }).assign({ massCasualty: true }).write(); });
      io.emit('mass_casualty_alert', event);
      console.log(`🚨 MASS CASUALTY: ${nearby.length} incidents within 500m / 10min`);
    }
  });

  // ── 2. Deploy Unit ──────────────────────────────────────────
  socket.on('deploy_unit', (data) => {
    console.log('🚑 Dispatching rescue unit:', data);
    let hospitalName = 'Nearest Emergency Ward';
    let eta = data.eta || '5 Minutes';
    if (data.hospitalId) {
      const h = db.get('hospitals').find({ id: data.hospitalId }).value();
      if (h) hospitalName = h.name; else hospitalName = data.hospitalId;
    }
    // Find incident for clinical brief
    const incident = data.sosId ? db.get('incidents').find({ id: data.sosId }).value() : null;
    if (incident) {
      // Phase 1: Clinical Brief
      const brief = { injuryType: incident.subtype, triageLevel: incident.triage?.level, firstAidGiven: incident.triage?.firstAid, bloodType: incident.bloodType || 'Unknown', allergies: incident.allergies || 'None reported', etaMins: eta, vitals: incident.vitals || null };
      io.emit('clinical_brief', { sosId: data.sosId, hospital: hospitalName, brief });
      // Phase 1: Specialist Alert
      const specialistMap = { MEDICAL:'Cardiologist', ACCIDENT:'Trauma Surgeon', INJURY:'Trauma Surgeon', TRAPPED:'Trauma Surgeon', UNCONSCIOUS:'Neurologist', PREGNANCY:'OB/GYN Specialist', FIRE:'Burns Specialist', COLLAPSE:'Orthopedic Surgeon', EARTHQUAKE:'Trauma Surgeon', FLOOD:'Emergency Specialist', STORM:'Emergency Specialist', GAS:'Toxicologist' };
      const equipmentMap = { MEDICAL:['12-lead ECG','Defibrillator','Crash cart','Heparin drip','O2 mask'], ACCIDENT:['Trauma bay','C-spine board','IV access x2','CT prep'], INJURY:['Hemorrhage kit','Tourniquet','IV access','Wound kit'], TRAPPED:['Orthopedic kit','Crush protocol','IV fluids x3'], UNCONSCIOUS:['Airway kit','Bag-valve mask','Intubation tray'], PREGNANCY:['OB kit','Fetal monitor','Neonatal resus'], FIRE:['Burns kit','Airway mgmt','IV fluids','Sterile dressings'], COLLAPSE:['Trauma bay','Fracture kit'], EARTHQUAKE:['Mass casualty kit','Triage tags','Trauma bay x2'], FLOOD:['Hypothermia kit','O2 therapy'], STORM:['Trauma bay','O2 therapy'], GAS:['Antidote kit','Decontamination bay'] };
      const sub = incident.subtype || '';
      if (incident.triage?.level === 'CRITICAL' && specialistMap[sub]) io.emit('specialist_alert', { specialistType: specialistMap[sub], sosId: data.sosId, brief, hospital: hospitalName });
      io.emit('equipment_prep', { sosId: data.sosId, equipment: equipmentMap[sub] || ['Standard emergency kit'], hospital: hospitalName, subtype: sub });
      // Timeline update
      db.get('incidents').find({ id: data.sosId }).assign({ 'timeline.dispatched': new Date().toISOString() }).write();
    }
    io.emit('help_is_coming', { eta, hospital: hospitalName, sosId: data.sosId });
    io.emit('dispatch_assignment', { 
      gps: data.targetGps, 
      vitals: { 
        blood: (incident && incident.bloodType) ? incident.bloodType : 'Unknown', 
        trauma: (incident && incident.triage) ? incident.triage.level : 'Priority Alpha', 
        hr: (incident && incident.vitals) ? incident.vitals.heart_rate : '--' 
      }, 
      sosId: data.sosId, 
      hospital: hospitalName, 
      firstAid: (incident && incident.triage) ? incident.triage.firstAid : 'Assess scene safety and stabilize patient.',
      bedReserved: (incident && incident.autoReserved) ? true : false
    });
    db.get('deployments').push({ sosId: data.sosId, targetGps: data.targetGps, hospital: hospitalName, eta, deployedAt: new Date().toISOString() }).write();
    const inc = db.get('incidents').find({ id: data.sosId });
    if (inc.value()) inc.assign({ status: 'DEPLOYED' }).write();
    console.log(`✅ Unit deployed to ${data.sosId} → ${hospitalName} (ETA: ${eta})`);
  });

  // ── 3. Responder GPS Tracking ───────────────────────────────
  socket.on('responder_gps', (data) => {
    io.emit('ambulance_position', { lat: data.lat, lon: data.lon, arrived: false });
  });

  // ── 4. Patient Vitals ────────────────────────────────────────
  socket.on('submit_vitals', (data) => {
    const { incidentId, vitals } = data;
    const v = { ...vitals, recordedAt: new Date().toISOString() };
    const inc = db.get('incidents').find({ id: incidentId });
    if (inc.value()) { inc.assign({ vitals: v }).write(); }
    io.emit('patient_vitals', { incidentId, vitals: v });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// ── Cron: Monthly Quality Score ──────────────────────────────────
if (cron) {
  cron.schedule('0 2 1 * *', () => {
    console.log('⏱ Running monthly quality score update...');
    const incidents = db.get('incidents').value();
    const hospitals = db.get('hospitals').value();
    const subtypeMap = { MEDICAL:'cardiac', ACCIDENT:'trauma', INJURY:'trauma', UNCONSCIOUS:'neuro', FIRE:'burns', COLLAPSE:'trauma', EARTHQUAKE:'trauma', PREGNANCY:'cardiac' };
    hospitals.forEach((h, i) => {
      const qs = { cardiac:0, trauma:0, neuro:0, burns:0, overall:0, counts: {} };
      const related = incidents.filter(inc => { const dep = db.get('deployments').find({ sosId: inc.id }).value(); return dep && dep.hospital === h.name; });
      related.forEach(inc => {
        const cat = subtypeMap[inc.subtype] || 'overall';
        const good = inc.outcome === 'treated_discharged' || inc.outcome === 'admitted';
        qs[cat] = ((qs[cat]||0) * (qs.counts[cat]||0) + (good?1:0)) / ((qs.counts[cat]||0)+1);
        qs.counts[cat] = (qs.counts[cat]||0)+1;
      });
      qs.overall = (Object.values({cardiac:qs.cardiac,trauma:qs.trauma,neuro:qs.neuro,burns:qs.burns}).reduce((a,b)=>a+b,0))/4;
      delete qs.counts;
      hospitals[i].qualityScore = { ...hospitals[i].qualityScore, ...qs };
    });
    db.set('hospitals', hospitals).write();
    console.log('✅ Quality scores updated.');
  });

  // Cron: Weekly Demand Forecast
  cron.schedule('0 3 * * 1', () => {
    console.log('⏱ Running weekly demand forecast...');
    const incidents = db.get('incidents').value();
    const windows = {};
    incidents.forEach(inc => {
      const d = new Date(inc.receivedAt || inc.timestamp);
      if (isNaN(d)) return;
      const key = `${d.getDay()}-${d.getHours()}`;
      windows[key] = (windows[key]||0) + 1;
    });
    const avg = Object.values(windows).reduce((a,b)=>a+b,0) / (Object.keys(windows).length||1);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const top5 = Object.entries(windows).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) => {
      const [day,hour] = k.split('-');
      const pct = Math.round((v/avg-1)*100);
      return { day: days[parseInt(day)], hour: parseInt(hour), count: v, pctAboveAvg: pct > 0 ? pct : 0 };
    });
    db.set('forecast', top5).write();
    io.emit('forecast_updated', { forecast: top5 });
    console.log('✅ Forecast updated:', top5.length, 'peak windows.');
  });

  // Cron: 10-min Anomaly Detector
  cron.schedule('*/10 * * * *', () => {
    const incidents = db.get('incidents').value();
    const now = Date.now();
    const recent = incidents.filter(inc => (now - new Date(inc.receivedAt||inc.timestamp).getTime()) < 7200000);
    const subtypeCounts = {};
    recent.forEach(inc => {
      const key = `${inc.subtype}-${Math.floor(inc.lat/0.01)*0.01},${Math.floor(inc.lon/0.01)*0.01}`;
      subtypeCounts[key] = (subtypeCounts[key]||0)+1;
    });
    const allIncidents = incidents;
    Object.entries(subtypeCounts).forEach(([key, count]) => {
      const [subtype] = key.split('-');
      const historical = allIncidents.filter(inc => inc.subtype===subtype).length / 12;
      if (count > historical * 3 && count >= 3) {
        const anomaly = { subtype, zone: key.split('-')[1], count, baseline: Math.round(historical), detectedAt: new Date().toISOString() };
        db.get('anomalies').push(anomaly).write();
        io.emit('anomaly_alert', anomaly);
        console.log('⚠️ Anomaly detected:', anomaly);
      }
    });
  });
}

// ── Server Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║     🚨 ONCLICK v4.0 — Emergency SOS         ║');
  console.log('╠═══════════════════════════════════════════════╣');
  console.log(`║  🌐 App:        http://localhost:${PORT}          ║`);
  console.log(`║  📊 Dashboard:  http://localhost:${PORT}/dashboard ║`);
  console.log(`║  🚑 Responder:  http://localhost:${PORT}/responder ║`);
  console.log(`║  🏥 Hospital:   http://localhost:${PORT}/hospital-admin ║`);
  console.log(`║  📈 Analytics:  http://localhost:${PORT}/analytics ║`);
  console.log(`║  💊 Vitals:     http://localhost:${PORT}/vitals   ║`);
  console.log('╠═══════════════════════════════════════════════╣');
  console.log('║  🧠 AI Triage:  Ollama + Keyword Fallback    ║');
  console.log('║  💾 DB: LowDB  📦 Cron: Active  📄 PDF: OK  ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
});
