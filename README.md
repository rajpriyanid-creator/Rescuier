# 🚨 DisasterMesh — HACKHAZARDS '26

> **Full-stack disaster response platform for India**
> Real-time earthquake early warning · SOS routing · Encrypted vault · Multilingual TTS alerts

---

## 🏗️ Architecture

```
DisasterMesh/
├── disastermesh-backend/     # Node.js + Express + TypeScript API
├── disastermesh-admin/       # React + Vite admin dashboard
├── disastermesh-app/         # React Native (Expo) mobile app
└── render.yaml               # One-click Render deployment
```

### Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native · Expo SDK 52 · Expo Router v4 |
| Admin Dashboard | React 18 · Vite 6 · Tailwind CSS · Leaflet |
| Backend API | Node.js 20 · Express 4 · TypeScript |
| Primary DB | MongoDB Atlas (Mongoose) |
| Graph DB | Neo4j AuraDB (spatial routing, family links) |
| Real-time | Socket.io v4 |
| Auth | JWT + bcrypt (username/password) |
| TTS | Sarvam AI Bulbul v1 (11 Indian languages) |
| Push | Expo Push Notifications |
| Offline | SQLite via expo-sqlite |
| Encryption | AES-256-GCM (Web Crypto API) |
| Hosting | Render (free tier, Singapore region) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- MongoDB Atlas account (free M0 cluster)
- Neo4j AuraDB account (free instance)
- Render account (free)
- Expo Go app on your phone

---

## 1. Backend Setup

```bash
cd disastermesh-backend
npm install
cp .env.example .env
# Fill in .env (see below)
npm run dev
```

### Required `.env` values

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/disastermesh
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
JWT_SECRET=minimum_64_chars_random_string
JWT_REFRESH_SECRET=another_64_chars_random_refresh_string
SARVAM_API_KEY=your_key          # Optional — TTS
CORS_ORIGIN=http://localhost:3000
```

---

## 2. Admin Dashboard Setup

```bash
cd disastermesh-admin
npm install
# Create .env.local:
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env.local
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env.local
npm run dev
# Open http://localhost:3000
```

To get admin access, first register via the mobile app, then run:
```js
// In MongoDB Atlas console or mongosh:
db.users.updateOne({ phone: "+91XXXXXXXXXX" }, { $set: { role: "admin" } })
```

---

## 3. Mobile App Setup

```bash
cd disastermesh-app
npm install
# Create .env:
echo "EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api/v1" > .env
echo "EXPO_PUBLIC_SOCKET_URL=http://YOUR_LOCAL_IP:5000" >> .env
npx expo start
# Scan QR with Expo Go
```

> Use your machine's LAN IP (e.g. `192.168.1.5`), not `localhost`, so your phone can reach the backend.

---

## 🌐 Render Deployment (Free Hosting)

### Step 1 — Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
gh repo create disastermesh --public --push
```

### Step 2 — Deploy via render.yaml
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New → Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and creates both services automatically

### Step 3 — Set Environment Variables
In the Render dashboard, for the **disastermesh-api** service, add all secrets from `.env.example`:
- `MONGODB_URI`
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- `SARVAM_API_KEY`
- `CORS_ORIGIN` → set to your admin dashboard URL

### Step 4 — Update App for Production
```env
# disastermesh-app/.env
EXPO_PUBLIC_API_URL=https://disastermesh-api.onrender.com/api/v1
EXPO_PUBLIC_SOCKET_URL=https://disastermesh-api.onrender.com
```

> **Render free tier note:** The backend spins down after 15 minutes of inactivity. Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 10 minutes to keep it alive.

---

## 📱 Key Features

### 🌍 Seismic Early Warning
- Accelerometer sampling at 20 Hz using STA/LTA algorithm
- Only triggers on phones AT_REST or SLIGHT_MOTION
- 30-second cooldown between triggers
- Wave propagation analysis: validates seismic wave speed (2–8 km/s) across devices
- Requires 10+ devices reporting within 60 seconds for confirmation
- Admin sees live detection map; can confirm and broadcast early warning

### 🆘 SOS System
- 6 SOS types: trapped, injured, water, medicine, rescue, fire
- Priority levels: critical, urgent, standard
- Offline queuing via SQLite — syncs when reconnected
- Auto-notifies all responders in the city via push + socket
- Admin/responder can claim and resolve from dashboard

### 🔒 Emergency Vault
- AES-256-GCM encryption using device Web Crypto API
- Key stored in iOS Keychain / Android Keystore via expo-secure-store
- Biometric (Face ID / fingerprint) gate on open
- Categories: ID proof, medical, insurance, property, emergency
- Zero server storage — fully local

### 💬 Crisis Chat
- City-scoped real-time chat via Socket.io
- Message types: text, location share, medical need, resource offer, shelter, missing person
- Admin can pin messages and hide spam
- Rate limited: 5 messages/minute per user

### 🗺️ Live Admin Map
- Leaflet map showing all user location pins (colour-coded by status)
- SOS request markers with priority colours
- Admin-placed markers: safe zones, hospitals, shelters, hazard zones
- Real-time updates via socket

### 🔔 Multilingual TTS Alerts
- Sarvam AI Bulbul v1 generates audio in Tamil, Hindi, Telugu, Kannada, Malayalam and 6 more
- Alert audio generated server-side and sent as base64 WAV
- Falls back gracefully if Sarvam API key not set

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register with username, phone, password, city |
| POST | `/api/v1/auth/login` | Login with Disaster ID + password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| DELETE | `/api/v1/auth/logout` | Logout |

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/events/active` | Get active disaster for city |
| POST | `/api/v1/admin/event/declare` | Declare disaster (admin) |
| PUT | `/api/v1/admin/event/:id/resolve` | Resolve disaster (admin) |

### SOS
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/sos` | Create SOS request |
| GET | `/api/v1/sos/city` | Get city SOS queue (responder) |
| PUT | `/api/v1/sos/:id/claim` | Claim SOS (responder) |
| PUT | `/api/v1/sos/:id/resolve` | Resolve SOS |

### Seismic
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/seismic/report` | Report seismic detection |
| GET | `/api/v1/seismic/analysis/:city` | Get wave analysis for city |

Full API docs available at `/api/v1` (returns route list).

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join:city` | `{ cityId }` | Join city alert room |
| `join:admin` | `{ cityId }` | Join admin room |
| `join:family` | `{ groupId }` | Join family room |
| `location:update` | `{ userId, lat, lng, status, eventId, cityId }` | Real-time location |
| `seismic:detect` | `{ deviceId, ratio, phoneState, lat, lng, cityId }` | Seismic detection |
| `chat:typing` | `{ cityId, userId, name }` | Typing indicator |

### Server → Client
| Event | Description |
|---|---|
| `disaster:declared` | New disaster declared |
| `disaster:resolved` | Disaster resolved |
| `alert:new` | New alert broadcast |
| `sos:new` | New SOS request |
| `sos:status_update` | SOS status changed |
| `location:update` | User location update (admin) |
| `chat:message` | New chat message |
| `seismic:wave_detected` | Wave confirmed (admin) |
| `seismic:confirmed` | Earthquake confirmed |

---

## 🗄️ Neo4j Graph Schema

```
(Person)-[:PART_OF]->(FamilyGroup)
(Person)-[:SENT_SOS]->(SOSRequest)
(Person)-[:LOCATED_AT]->(Location)
(RescueTeam)-[:RESPONDS_TO]->(SOSRequest)
(Resource)-[:LOCATED_AT]->(Location)
(SeismicDetection)-[:PART_OF_EVENT]->(DisasterEvent)
(HazardZone)-[:COVERS]->(Location)
```

---

## 🛡️ Security

- Helmet.js with CSP
- Rate limiting: 200 req/15min general, 20 auth, 10 SOS, 30 location
- JWT with 7-day access / 30-day refresh tokens
- Refresh tokens hashed with bcrypt before storage
- Passwords hashed with bcrypt (12 rounds) before storage
- Input validation via express-validator
- CORS restricted to known origins
- AES-256-GCM for vault encryption
- Biometric gate on vault access

---

## 🧪 Development Notes

### Database indexes
All frequently queried fields have MongoDB indexes (phone, city, disasterId, status, createdAt).

### Offline sync
The app queues SOS requests and location updates in SQLite when offline. On reconnection, pending items sync automatically.

### Seismic calibration
- Default trigger ratio: 3.5 (STA/LTA)
- Adjustable per-city via admin settings panel
- Min devices for confirmation: 10 (adjustable)

---

## 📂 Project Structure

```
disastermesh-backend/src/
├── config/         # MongoDB, Neo4j, env
├── controllers/    # Business logic
├── middleware/     # Auth, admin, rate limiting
├── models/         # Mongoose schemas
├── routes/         # Express routes
├── services/       # Neo4j, Sarvam, Socket, Push
└── socket/         # Socket.io event handlers

disastermesh-admin/src/
├── components/     # Layout, UI components
├── pages/          # Route pages
├── services/       # API, Socket
└── store/          # Zustand global state

disastermesh-app/
├── app/            # Expo Router screens
│   ├── auth/       # Login, Register
│   ├── tabs/       # Home, Map, Chat, Alerts, Profile
│   └── (modals)    # SOS, Vault, Family, Settings
├── hooks/          # Seismic, Location, Push
├── services/       # API, Socket, Vault encryption
├── store/          # Zustand global state
├── db/             # SQLite offline storage
└── utils/          # Constants
```

---

*Built for HACKHAZARDS '26 — India's largest online hackathon*
