/**
 * ONCLICK Emergency System — Database Schema Definitions
 * 
 * These schemas define the MongoDB collections used by the Vercel
 * serverless API routes. They serve as documentation and can be
 * used with Mongoose or similar ODMs.
 */

// ── SOS Alert ───────────────────────────────────────────────
export const sosAlertSchema = {
  collection: 'sos_alerts',
  fields: {
    _id:           'ObjectId',            // Auto-generated
    type:          'String',              // 'Emergency' | 'Disaster' | 'Quick'
    subtype:       'String',              // 'Medical' | 'Flood/Fire' | 'Panic' etc.
    severity:      'String',              // 'STABLE' | 'URGENT' | 'CRITICAL' | 'UNKNOWN'
    mobility:      'String',              // 'CAN_MOVE' | 'TRAPPED' | 'CANNOT_MOVE'
    patientName:   'String',              // Display name
    location:      'String',              // Human-readable address
    lat:           'Number',              // GPS latitude
    lng:           'Number',              // GPS longitude
    status:        'String',              // 'Active' | 'Dispatched' | 'Resolved'
    victimCount:   'Number',              // Number of people affected
    notes:         'String',              // Free-text description
    bloodType:     'String | null',       // Optional blood type
    emergencyContact: {
      name:        'String',
      phone:       'String',
    },
    assignedAmbulance: 'String | null',   // Ambulance ID if dispatched
    createdAt:     'Date',                // ISO timestamp
    updatedAt:     'Date',                // Last status change
  },
  indexes: [
    { fields: { status: 1, createdAt: -1 }, name: 'status_time' },
    { fields: { lat: 1, lng: 1 },           name: 'geolocation'  },
  ],
};

// ── User / Admin ────────────────────────────────────────────
export const userSchema = {
  collection: 'users',
  fields: {
    _id:           'ObjectId',
    hospitalName:  'String',              // Associated hospital
    uid:           'String',              // Unique admin ID (e.g. ADMIN-001)
    passwordHash:  'String',              // bcrypt hash
    role:          'String',              // 'admin' | 'dispatcher' | 'viewer'
    lastLogin:     'Date | null',
    createdAt:     'Date',
  },
  indexes: [
    { fields: { uid: 1 }, name: 'uid_unique', unique: true },
  ],
};

// ── Hospital ────────────────────────────────────────────────
export const hospitalSchema = {
  collection: 'hospitals',
  fields: {
    _id:           'ObjectId',
    name:          'String',
    address:       'String',
    lat:           'Number',
    lng:           'Number',
    capacity: {
      icuBeds:     '{ total: Number, available: Number }',
      oxygenLtrs:  'Number',
      bloodUnits:  '{ type: String, units: Number }[]',
      surgeons:    '{ total: Number, active: Number }',
    },
    doctors:       'ObjectId[]',          // Refs → users collection
    ambulances: [{
      id:          'String',
      driver:      'String',
      lat:         'Number',
      lng:         'Number',
      status:      'String',              // 'Available' | 'Dispatched' | 'Offline'
      eta:         'String',
    }],
    createdAt:     'Date',
    updatedAt:     'Date',
  },
  indexes: [
    { fields: { name: 1 }, name: 'hospital_name', unique: true },
  ],
};
