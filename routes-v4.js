// ── ONCLICK v4.0 — New Routes Module ────────────────────────────
const path = require('path');

const specialistMap = {
  MEDICAL:'Cardiologist', ACCIDENT:'Trauma Surgeon', INJURY:'Trauma Surgeon',
  TRAPPED:'Trauma Surgeon', UNCONSCIOUS:'Neurologist', PREGNANCY:'OB/GYN Specialist',
  FIRE:'Burns Specialist', COLLAPSE:'Orthopedic Surgeon', EARTHQUAKE:'Trauma Surgeon',
  FLOOD:'Emergency Specialist', STORM:'Emergency Specialist', GAS:'Toxicologist'
};

const equipmentMap = {
  MEDICAL:    ['12-lead ECG','Defibrillator','Crash cart','Heparin drip','O2 mask'],
  ACCIDENT:   ['Trauma bay','C-spine board','IV access x2','Blood type kit','CT prep'],
  INJURY:     ['Hemorrhage kit','Tourniquet','IV access','Blood transfusion','Wound kit'],
  TRAPPED:    ['Orthopedic kit','Crush protocol','IV fluids x3','Fasciotomy tray'],
  UNCONSCIOUS:['Airway kit','Bag-valve mask','Intubation tray','Neuro monitor'],
  PREGNANCY:  ['OB kit','Fetal monitor','Neonatal resus','Magnesium sulfate'],
  FIRE:       ['Burns kit','Airway mgmt','IV fluids','Sterile dressings','Morphine'],
  COLLAPSE:   ['Trauma bay','Orthopedic tray','Fracture kit','Blood bank alert'],
  EARTHQUAKE: ['Mass casualty kit','Triage tags','IV access x4','Trauma bay x2'],
  FLOOD:      ['Hypothermia kit','O2 therapy','IV fluids','Rescue supplies'],
  STORM:      ['Trauma bay','Fracture kit','O2 therapy'],
  GAS:        ['Antidote kit','O2 therapy','Decontamination bay','Ventilator prep']
};

const capabilityRequirements = {
  MEDICAL:['cathLab','ct'], ACCIDENT:['traumaCenter','ct'], INJURY:['traumaCenter'],
  UNCONSCIOUS:['mri','ct'], PREGNANCY:['nicu'], FIRE:['burnsUnit'],
  COLLAPSE:['traumaCenter','ct'], EARTHQUAKE:['traumaCenter'], TRAPPED:['traumaCenter'],
  FLOOD:['ct'], STORM:['ct'], GAS:['ct','dialysis']
};

module.exports = function(app, io, db, fetch, ollamaModelGetter, PDFDocument) {

  const OLLAMA_URL = 'http://localhost:11434/api/generate';

  // ── Phase 1: Specialist Alert ──────────────────────────────────
  app.post('/api/alert-specialist', (req, res) => {
    const { hospitalId, specialistType, brief, sosId } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const alert = { id: uuidv4().slice(0,8).toUpperCase(), hospitalId, specialistType, brief, sosId, createdAt: new Date().toISOString() };
    db.get('specialistAlerts').push(alert).write();
    io.emit('specialist_alert', alert);
    res.json({ success: true, alert });
  });

  // ── Phase 1: Vitals Submission ─────────────────────────────────
  app.post('/api/vitals/:incidentId', (req, res) => {
    const vitals = { ...req.body, recordedAt: new Date().toISOString() };
    const incident = db.get('incidents').find({ id: req.params.incidentId });
    if (!incident.value()) return res.status(404).json({ error: 'Not found' });
    incident.assign({ vitals }).write();
    io.emit('patient_vitals', { incidentId: req.params.incidentId, vitals });
    res.json({ success: true });
  });

  // ── Phase 2: Hospital Admin Update ────────────────────────────
  app.post('/api/hospital-admin/update', (req, res) => {
    const { hospitalId, capabilities, equipment_status, bloodBank } = req.body;
    const hospitals = db.get('hospitals').value();
    const idx = hospitals.findIndex(h => h.id === hospitalId);
    if (idx === -1) return res.status(404).json({ error: 'Hospital not found' });
    if (capabilities)     hospitals[idx].capabilities     = { ...hospitals[idx].capabilities,     ...capabilities };
    if (equipment_status) hospitals[idx].equipment_status = { ...hospitals[idx].equipment_status, ...equipment_status };
    if (bloodBank)        hospitals[idx].bloodBank        = { ...hospitals[idx].bloodBank,        ...bloodBank };
    db.set('hospitals', hospitals).write();
    io.emit('hospitals_updated', hospitals);
    res.json({ success: true, hospital: hospitals[idx] });
  });

  // ── Phase 3: Timeline Update ───────────────────────────────────
  app.post('/api/timeline-update', (req, res) => {
    const { incidentId, milestone, timestamp } = req.body;
    const ts = timestamp || new Date().toISOString();
    const incident = db.get('incidents').find({ id: incidentId });
    if (!incident.value()) return res.status(404).json({ error: 'Not found' });
    const tl = incident.value().timeline || {};
    tl[milestone] = ts;
    incident.assign({ timeline: tl }).write();
    io.emit('timeline_update', { incidentId, milestone, timestamp: ts });
    res.json({ success: true });
  });

  // ── Phase 3: Heatmap ──────────────────────────────────────────
  app.get('/api/analytics/heatmap', (req, res) => {
    const incidents = db.get('incidents').value();
    const grid = Array.from({length:7}, () => Array(24).fill(0));
    incidents.forEach(inc => {
      const d = new Date(inc.receivedAt || inc.timestamp);
      if (!isNaN(d)) grid[d.getDay()][d.getHours()]++;
    });
    res.json({ grid, days:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] });
  });

  // ── Phase 3: Geo Zones ────────────────────────────────────────
  app.get('/api/analytics/geo-zones', (req, res) => {
    const incidents = db.get('incidents').value();
    const zones = {};
    incidents.forEach(inc => {
      if (!inc.lat || !inc.lon) return;
      const key = `${Math.floor(inc.lat/0.01)*0.01},${Math.floor(inc.lon/0.01)*0.01}`;
      if (!zones[key]) zones[key] = { lat: Math.floor(inc.lat/0.01)*0.01+0.005, lon: Math.floor(inc.lon/0.01)*0.01+0.005, count:0, totalResp:0 };
      zones[key].count++;
      if (inc.timeline?.dispatched && inc.timeline?.sosRaised) {
        zones[key].totalResp += (new Date(inc.timeline.dispatched) - new Date(inc.timeline.sosRaised)) / 60000;
      }
    });
    res.json(Object.values(zones).map(z => ({ ...z, avgResponse: z.count ? z.totalResp/z.count : 0 })));
  });

  // ── Phase 3: Monthly Report ───────────────────────────────────
  app.get('/api/reports/monthly', (req, res) => {
    const incidents = db.get('incidents').value();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to   = new Date(now.getFullYear(), now.getMonth()+1, 1);
    const filtered = incidents.filter(inc => { const d=new Date(inc.receivedAt||inc.timestamp); return d>=from&&d<to; });
    const bySubtype={}, outcome={treated_discharged:0,admitted:0,referred:0,adverse:0,pending:0};
    let dtt=0, dttC=0;
    filtered.forEach(inc => {
      bySubtype[inc.subtype]=(bySubtype[inc.subtype]||0)+1;
      outcome[inc.outcome||'pending']=(outcome[inc.outcome||'pending']||0)+1;
      if (inc.timeline?.firstTreatment && inc.timeline?.patientReceived)
        { dtt+=(new Date(inc.timeline.firstTreatment)-new Date(inc.timeline.patientReceived))/60000; dttC++; }
    });
    res.json({ totalIncidents:filtered.length, bySubtype, avgDoorToTreatment:dttC?(dtt/dttC).toFixed(1):'N/A', outcomeBreakdown:outcome,
      referralRate:filtered.length?(outcome.referred/filtered.length*100).toFixed(1)+'%':'0%',
      adverseRate:filtered.length?(outcome.adverse/filtered.length*100).toFixed(1)+'%':'0%' });
  });

  // ── Phase 3: AI Analysis ──────────────────────────────────────
  app.post('/api/reports/ai-analysis', async (req, res) => {
    const ollamaModel = ollamaModelGetter();
    const fallback = '• Data collected.\n• AI unavailable — install Ollama.\n• Review subtypes manually.\n• Check door-to-treatment vs 8min target.\n• Adjust staffing for peak hours.';
    if (!fetch || !ollamaModel || ollamaModel==='__none__') return res.json({ analysis: fallback });
    try {
      const r = await fetch(OLLAMA_URL, { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ model:ollamaModel, prompt:`Emergency medicine analyst. Monthly data: ${JSON.stringify(req.body.stats)}. Write 5-bullet plain-language report. Identify 2 improvements. Be concise.`, stream:false, options:{temperature:0.4,num_predict:300} }), timeout:15000 });
      const result = await r.json();
      res.json({ analysis: result.response || fallback });
    } catch(e) { res.json({ analysis: fallback }); }
  });

  // ── Phase 4: Dispatcher Override ──────────────────────────────
  app.post('/api/incidents/:id/override', (req, res) => {
    const { originalHospitalId, chosenHospitalId, reason } = req.body;
    const inc = db.get('incidents').find({ id: req.params.id });
    if (!inc.value()) return res.status(404).json({ error: 'Not found' });
    inc.assign({ dispatcherOverride:{ originalHospitalId, chosenHospitalId, reason, timestamp:new Date().toISOString() } }).write();
    res.json({ success: true });
  });

  // ── Phase 4: Preposition Zones ────────────────────────────────
  app.get('/api/analytics/preposition', (req, res) => {
    const incidents = db.get('incidents').value();
    const clusters={};
    incidents.forEach(inc => {
      if (!inc.lat||!inc.lon) return;
      const key=`${Math.floor(inc.lat/0.02)*0.02},${Math.floor(inc.lon/0.02)*0.02}`;
      if (!clusters[key]) clusters[key]={ lat:Math.floor(inc.lat/0.02)*0.02+0.01, lon:Math.floor(inc.lon/0.02)*0.02+0.01, count:0 };
      clusters[key].count++;
    });
    const top3 = Object.values(clusters).sort((a,b)=>b.count-a.count).slice(0,3);
    res.json({ standbyZones:top3, forecast:db.get('forecast').value() });
  });

  // ── Phase 5: Family Notification (Stubbed) ────────────────────
  app.post('/api/notify', (req, res) => {
    const { phone, name, milestone, incidentId, eta, hospital } = req.body;
    const msg = `ONCLICK: ${name}, emergency contact update — ${milestone}. Hospital: ${hospital}. ETA: ${eta}. Ref: ${incidentId}`;
    console.log(`📱 [SMS STUB] → ${phone}: ${msg}`);
    res.json({ success:true, preview:msg });
  });

  // ── Phase 5: PDF Report ───────────────────────────────────────
  app.get('/api/report/pdf/:incidentId', (req, res) => {
    if (!PDFDocument) return res.status(503).json({ error:'pdfkit not installed. Run: npm install pdfkit' });
    const inc = db.get('incidents').find({ id:req.params.incidentId }).value();
    if (!inc) return res.status(404).json({ error:'Incident not found' });
    const doc = new PDFDocument({ size:'A4', margin:50 });
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename=onclick-${inc.id}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).font('Helvetica-Bold').text('ONCLICK Emergency Report',{align:'center'});
    doc.fontSize(9).font('Helvetica').fillColor('gray').text(`ID: ${inc.id}  |  ${new Date().toLocaleString()}`,{align:'center'});
    doc.moveDown().moveTo(50,doc.y).lineTo(550,doc.y).stroke().moveDown();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('black').text('Incident Summary');
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text(`Type: ${inc.type} — ${inc.subtype||'—'} | Status: ${inc.status}`);
    doc.text(`Received: ${new Date(inc.receivedAt).toLocaleString()}`);
    doc.text(`Location: ${inc.lat?.toFixed(5)}, ${inc.lon?.toFixed(5)}`);
    doc.text(`Notes: ${inc.notes||'None'}`);
    if(inc.emergencyContact?.name) doc.text(`Emergency Contact: ${inc.emergencyContact.name} — ${inc.emergencyContact.phone}`);
    doc.moveDown();
    if(inc.triage){ doc.fontSize(13).font('Helvetica-Bold').text('AI Triage'); doc.fontSize(10).font('Helvetica').fillColor('#333');
      doc.text(`Level: ${inc.triage.level} | Reason: ${inc.triage.reason}`);
      doc.text(`Required: ${inc.triage.requiredBed||'—'} bed / ${inc.triage.requiredDoctor||'—'}`);
      doc.text(`First Aid: ${inc.triage.firstAid||'—'}`); doc.moveDown(); }
    if(inc.vitals){ doc.fontSize(13).font('Helvetica-Bold').text('Patient Vitals'); doc.fontSize(10).font('Helvetica').fillColor('#333');
      const v=inc.vitals;
      if(v.bp_sys)       doc.text(`BP: ${v.bp_sys}/${v.bp_dia} mmHg`);
      if(v.heart_rate)   doc.text(`Heart Rate: ${v.heart_rate} BPM`);
      if(v.spo2)         doc.text(`SpO2: ${v.spo2}%`);
      if(v.resp_rate)    doc.text(`Respiratory Rate: ${v.resp_rate} breaths/min`);
      if(v.consciousness)doc.text(`Consciousness: ${v.consciousness}`);
      if(v.bleeding)     doc.text(`Bleeding: ${v.bleeding}`);
      if(v.pain_level!==undefined) doc.text(`Pain Level: ${v.pain_level}/10`);
      if(v.skin_color)   doc.text(`Skin Color: ${v.skin_color}`);
      doc.moveDown(); }
    if(inc.timeline){ doc.fontSize(13).font('Helvetica-Bold').text('Response Timeline'); doc.fontSize(10).font('Helvetica').fillColor('#333');
      Object.entries(inc.timeline).forEach(([k,v])=>{ if(v) doc.text(`${k}: ${new Date(v).toLocaleString()}`); }); doc.moveDown(); }
    if(inc.aiReview){ doc.fontSize(13).font('Helvetica-Bold').text('AI Post-Incident Review'); doc.fontSize(10).font('Helvetica').fillColor('#555').text(inc.aiReview); doc.moveDown(); }
    doc.fontSize(8).fillColor('gray').text('ONCLICK Emergency SOS System v4.0',{align:'center'});
    doc.end();
  });

  // ── Phase 6: Post-Incident AI Review ─────────────────────────
  app.post('/api/post-incident-review', async (req, res) => {
    const { incidentId } = req.body;
    const ollamaModel = ollamaModelGetter();
    const inc = db.get('incidents').find({ id:incidentId }).value();
    if (!inc) return res.status(404).json({ error:'Not found' });
    let review = `Response completed for ${incidentId}. Add Ollama for AI analysis.`;
    if (fetch && ollamaModel && ollamaModel!=='__none__') {
      try {
        const r = await fetch(OLLAMA_URL,{ method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({ model:ollamaModel, prompt:`Analyse emergency response. Identify longest delay and one improvement in 3 sentences: ${JSON.stringify({id:inc.id,type:inc.type,subtype:inc.subtype,level:inc.triage?.level,timeline:inc.timeline})}`, stream:false, options:{temperature:0.3,num_predict:150} }), timeout:10000 });
        const result=await r.json(); review=result.response||review;
      } catch(e){}
    }
    db.get('incidents').find({ id:incidentId }).assign({ aiReview:review }).write();
    res.json({ success:true, review });
  });

  // ── Export helper maps for use in server.js ───────────────────
  return { specialistMap, equipmentMap, capabilityRequirements };
};
