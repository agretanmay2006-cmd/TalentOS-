export const DOCTORS = [
  { id: 1, name: "Dr. Sarah Smith", specialty: "Cardiologist", available: true, avatar: "https://i.pravatar.cc/150?u=sarah" },
  { id: 2, name: "Dr. James Wilson", specialty: "Trauma Surgeon", available: true, avatar: "https://i.pravatar.cc/150?u=james" },
  { id: 3, name: "Dr. Emily Chen", specialty: "Neurologist", available: false, avatar: "https://i.pravatar.cc/150?u=emily" },
  { id: 4, name: "Dr. Michael Brown", specialty: "Pediatrician", available: true, avatar: "https://i.pravatar.cc/150?u=michael" },
  { id: 5, name: "Dr. Jessica Davis", specialty: "Orthopedics", available: false, avatar: "https://i.pravatar.cc/150?u=jessica" }
];

export const AMBULANCES = [
  { id: "AMB-101", driver: "John Doe", eta: "4 mins", lat: 28.6139, lng: 77.2090 },
  { id: "AMB-102", driver: "Mike Ross", eta: "8 mins", lat: 28.6200, lng: 77.2150 }
];

export const SOS_EVENTS = [
  {
    id: "SOS-5892",
    patientName: "Robert Johnson",
    location: "Connaught Place, New Delhi",
    lat: 28.6304,
    lng: 77.2177,
    time: "10:42 AM",
    status: "Active"
  },
  {
    id: "SOS-5893",
    patientName: "Alice Walker",
    location: "India Gate, New Delhi",
    lat: 28.6129,
    lng: 77.2295,
    time: "10:15 AM",
    status: "Resolved"
  }
];

export const PATIENTS = [
  { id: "PT-001", name: "John Doe", age: 45, condition: "Hypertension", lastVisit: "2023-10-25" },
  { id: "PT-002", name: "Jane Smith", age: 32, condition: "Pregnancy", lastVisit: "2023-10-26" },
  { id: "PT-003", name: "David Lee", age: 58, condition: "Diabetes", lastVisit: "2023-10-27" },
  { id: "PT-004", name: "Sarah Connor", age: 29, condition: "Asthma", lastVisit: "2023-10-28" }
];
