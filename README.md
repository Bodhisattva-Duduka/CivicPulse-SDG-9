# CivicPulse

Crowdsourced civic-infrastructure reporting app. Citizens photograph problems (potholes, broken streetlights, water leaks, etc.), AI classifies and routes them to the correct Indian government department. Departments triage via a map+list dashboard with SLA deadlines.

## Prerequisites

- **Node.js** v18+
- **MongoDB** running locally on port 27017
  - Option A: `docker run -d -p 27017:27017 --name civicpulse-mongo mongo:7`
  - Option B: Local MongoDB install
- **Cloudinary** account with an unsigned upload preset
- **Google AI API key** (Gemini 2.5 Flash, free tier)

## Setup

```bash
# 1. Clone and install
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env — fill in:
#   JWT_SECRET (any long random string)
#   GEMINI_API_KEY (from Google AI Studio)
#   CLOUDINARY_CLOUD_NAME
#   CLOUDINARY_UPLOAD_PRESET

# 3. Create client env (for Cloudinary uploads)
cat > client/.env << 'EOF'
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
EOF

# 4. Seed demo data
npm run seed
```

## Running

### Dev mode (hot reload)

```bash
# Terminal 1 — API server
npm run dev:server

# Terminal 2 — Vite dev server (proxies /api to :4000)
npm run dev:client
```

### Demo mode (single port, ngrok-ready)

```bash
npm run build    # Builds client, copies to server/public
npm start        # Express on port 4000, serves both API and app
ngrok http 4000  # One tunnel, one URL
```

## Demo Accounts

| Email | Password | Role |
|---|---|---|
| `pwd@civicpulse.demo` | `Password123!` | department (PWD) |
| `sanitation@civicpulse.demo` | `Password123!` | department (SANITATION) |
| `water@civicpulse.demo` | `Password123!` | department (WATER_BOARD) |
| `electricity@civicpulse.demo` | `Password123!` | department (ELECTRICITY) |
| `traffic@civicpulse.demo` | `Password123!` | department (TRAFFIC_POLICE) |
| `admin@civicpulse.demo` | `Password123!` | admin |
| `citizen1@civicpulse.demo` | `Password123!` | citizen |
| `citizen2@civicpulse.demo` | `Password123!` | citizen |

## Tech Stack

- **Frontend:** Vite + React, Tailwind CSS, Leaflet maps, Lucide icons
- **Backend:** Express, Mongoose, JWT auth
- **AI:** Gemini 2.5 Flash for image classification
- **Dedup:** Perceptual hashing (dHash) + GPS proximity
- **Images:** Cloudinary (unsigned upload)
