# ONCLICK — Universal Emergency SOS System: Deep Technical Documentation

**Version**: 3.0 (Production Upgraded)  
**Objective**: To provide a zero-barrier, AI-driven emergency response infrastructure that operates reliably in high-stress, low-connectivity, and critical-time scenarios.

---

## 1. Project Core Identity & Problem Statement
ONCLICK solves the "Emergency Friction" problem. Traditional SOS systems require app installs, account creation, or complex manual reporting. ONCLICK eliminates these barriers by providing a web-based, PWA-enabled interface that captures GPS instantly and uses AI to triage medical/disaster needs automatically.

---

## 2. Exhaustive Technology Stack

### Backend Infrastructure
- **Environment**: Node.js (V8 Runtime)
- **Web Server**: Express.js (High-performance routing)
- **Data Persistence**: LowDB 1.0.0 (Synchronous JSON-based storage using `FileSync` adapter)
- **Real-time Engine**: Socket.io 4.7.4 (WebSockets with polling fallback)
- **Identity Management**: UUID v4 (RFC4122 compliant unique identifiers)
- **Network Client**: Node-fetch 2.7.0 (API integration with Ollama)

### Frontend Engine
- **Markup**: Semantic HTML5 (Optimized for accessibility and mobile browsers)
- **Logic**: Vanilla ES6+ JavaScript (No heavy frameworks for maximum load speed)
- **Styling**: Vanilla CSS3 with Custom Properties (Design Tokens)
- **Mapping**: Leaflet.js & Leaflet Routing Machine (Open-source mapping stack)
- **Fonts**: Google Fonts Integration (`Epilogue` for heads, `Spline Sans` for body, `Spline Sans Mono` for status)

### AI & Intelligence Stack
- **Inference**: Ollama (Local AI server running at `http://localhost:11434`)
- **Models**: Priority list includes `llama3.2`, `llama3.1`, `mistral`, `gemma2`.
- **Triage Logic**: Dual-stage (LLM Inference → Keyword Fallback).

---

## 3. Backend Architectural Deep-Dive

### AI Triage & Prompt Engineering
The system uses a highly structured prompt to ensure JSON-only responses from local LLMs.
- **Disaster Prompt**: Focuses on "Scale" (Individual/Locality/City) and "Evacuation Priority".
- **Emergency Prompt**: Focuses on "Danger Keywords" and "Triage Level".
- **Keyword Fallback**: If Ollama is unreachable, a deterministic engine uses `subtype` mapping to assign severity, bed requirements (ICU/Emergency/Ventilator), and first-aid instructions.

### The Haversine Resource Matcher
`haversineDist(lat1, lon1, lat2, lon2)`
Uses the spherical law of cosines to calculate the shortest distance over the earth's surface.
1. Calculates distance (km) between SOS and all registered hospitals.
2. Filters by `hasBed` and `hasDoc` based on triage requirements.
3. Sorts by distance and adds a calculated `etaMins` (Distance * 1.5 + 3 min overhead).

### Auto-Reservation Logic
For **CRITICAL** incidents, the system triggers `autoReserve()`:
- Automatically decrements `beds` and `doctors` count in the DB.
- Emits `hospitals_updated` to all connected clients.
- Prevents resource exhaustion before a dispatcher can manually react.

---

## 4. Socket.io Protocol (Event Map)

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `send_sos` | Client → Server | `{type, subtype, lat, lon, notes, ...}` | Victim triggers an alert. |
| `new_sos_alert` | Server → Dashboard | `{...data, triage, optimalHospitals}` | Alert broadcast to dispatchers. |
| `deploy_unit` | Dashboard → Server | `{sosId, hospitalId, targetGps, eta}` | Dispatcher assigns a responder. |
| `help_is_coming` | Server → Victim | `{eta, hospital, sosId}` | Victim gets confirmation. |
| `dispatch_assignment`| Server → Responder | `{gps, vitals, hospital, firstAid}` | Mission data sent to responder terminal. |
| `responder_gps` | Responder → Server | `{lat, lon}` | Real-time GPS telemetry. |
| `ambulance_position` | Server → Dashboard | `{lat, lon, arrived}` | Telemetry forwarded to map. |

---

## 5. Frontend Design System (Dark Glass)

### Core Design Tokens (`:root`)
- **Primary Colors**: Indigo (`#4f46e5`), Purple (`#7c3aed`), Pink (`#ec4899`).
- **Glass System**: `rgba(16,16,36,0.45)` with `20px` backdrop blur.
- **Semantic Colors**: Critical (`#ff4757`), Urgent (`#ffa502`), Stable (`#2ed573`).
- **Motion**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (Spring effect for interactive cards).

### Component Architecture
- **Glass Card**: The standard container, using subtle borders (`rgba(255,255,255,0.06)`) to define edges on dark backgrounds.
- **Subtype Grid**: Optimized for one-handed thumb interaction with large tap targets.
- **Sending Overlay**: A high-z-index modal that locks the UI while AI analysis and resource reservation are in progress.
- **Scanline & Mesh**: Fixed-position overlays that provide a high-tech "Emergency HUD" aesthetic.

---

## 6. Progressive Web App (PWA) Implementation

### Service Worker (`sw.js`)
- **Strategy**: Stale-while-revalidate. Assets are served from cache for instant load, then updated in the background.
- **Offline Fallback**: Intercepts navigation requests; if the network fails, it serves `index.html` from the cache, ensuring the SOS buttons are *always* available.
- **Precaching**: Caches critical CSS, JS (Leaflet), and HTML pages during the `install` event.

---

## 7. Database Schema (LowDB / `db.json`)

### `incidents` Collection
- `id`: 8-character hex string.
- `status`: `ACTIVE`, `DEPLOYED`, or `RESOLVED`.
- `triage`: Object containing `level`, `reason`, `requiredBed`, `requiredDoctor`, `firstAid`.
- `lat` / `lon`: GPS coordinates of the victim.
- `receivedAt`: ISO 8601 timestamp.

### `hospitals` Collection
- `beds`: Object mapping types (`ICU`, `General`, `Ventilator`, `Emergency`, `Pediatric`) to integers.
- `doctors`: Object mapping specialties (`Cardiologist`, `Trauma`, etc.) to integers.

---

## 8. Deployment & Operational Checklist
1. **Model Setup**: Install Ollama and pull a supported model (`ollama pull llama3.2`).
2. **Server Start**: Run `npm start` to launch the Node.js environment.
3. **Connectivity**: The system auto-detects local network conditions. If offline, it switches to local keyword triage and displays the offline banner.
4. **Responder Sync**: Open `/responder` on a mobile device to act as a field unit; it will stream GPS to the `/dashboard`.
