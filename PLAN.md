# CivicPulse — Build Plan

**Read this entire document before writing any code.** This is the single source of truth for what to build. If you hit a decision this document doesn't cover, make the most reasonable choice consistent with the constraints below, note it in a `DECISIONS.md` file you create at the repo root, and keep going — don't block on it unless it's genuinely ambiguous, in which case ask the user directly.

## 1. What this is

CivicPulse is a crowdsourced civic-infrastructure reporting app for a hackathon demo. A citizen photographs a problem (pothole, broken streetlight, water leak, etc.) from their phone. The app auto-detects location, classifies the issue with an AI model, checks whether it's a duplicate of an existing report, and routes it to the correct Indian government department. Citizens track their own reports through a status lifecycle with an auto-computed fix deadline. Other nearby citizens can upvote a report to push it up a department's priority queue. Departments get a role-gated dashboard: a map + list view of their queue, with one-click triage actions.

Two demo devices, one shared build: a phone runs the citizen experience, a laptop runs a department/admin login — same web app, different accounts, reached over a single ngrok tunnel.

## 2. Non-negotiable constraints

- **Team:** 2 people, **3–4 days** total. Scope everything to actually finish. Prefer a fully working narrow app over a half-working broad one.
- **No cloud deployment.** No Vercel, no Render, no Atlas. Everything — frontend, backend, database — runs locally on one laptop. Public access for the demo is via a single `ngrok` tunnel (see §11).
- **Stack is fixed:** React (Vite) + shadcn/ui on the frontend, Node.js + Express + MongoDB (local) on the backend. Do not substitute these.
- **Auth:** email + password with JWT. No OAuth, no third-party auth.
- **Image storage:** Cloudinary (unsigned upload preset, direct browser → Cloudinary). Not AWS S3.
- **AI classification:** Gemini 2.5 Flash (Google's Generative AI API, free tier). Not OpenAI, not Anthropic, for this feature specifically.
- **Duplicate detection:** perceptual hashing (dHash) + GPS proximity. No external embedding API, no CLIP, no paid vision-similarity service.
- **No real-time infrastructure.** No WebSockets, no Socket.io. Polling or a manual refresh button is correct and sufficient.
- **Design:** dark theme, near-black background, off-white/white text as the base. shadcn/ui components. Icons from a proper component icon library (lucide-react, which ships with shadcn — see §9 for why this is the pick over alternatives), never emoji characters, never inline unicode symbols standing in for icons. Avoid generic "AI-generated SaaS" visual clichés — see §9 for the specific direction to follow.

## 3. Tech stack (exact)

**Frontend** — `client/`
- Vite + React 18 (JavaScript, not TypeScript — keep friction low for a 2-person hackathon build)
- Tailwind CSS + shadcn/ui (dark mode as the only mode — don't build a light theme)
- `lucide-react` for icons
- `react-router-dom` for routing
- `react-leaflet` + `leaflet.markercluster` (via `react-leaflet-cluster`) for the map, tiles from OpenStreetMap (no API key needed)
- `axios` for API calls
- `browser-image-compression` to shrink photos client-side before upload

**Backend** — `server/`
- Node.js + Express
- MongoDB via Mongoose, running **locally** (Docker `mongo:7` image, or a local install — either is fine, document whichever you pick in the README)
- `jsonwebtoken` + `bcrypt` for auth
- `@google/generative-ai` (official Node SDK) for Gemini calls
- `sharp` for image processing (used to compute the perceptual hash server-side)
- `dotenv` for config
- `multer` is **not** needed — photo bytes never touch this server; only the Cloudinary URL does

## 4. Repo structure

```
civicpulse/
├── PLAN.md                 (this file)
├── DECISIONS.md            (create this — log any judgment calls made during build)
├── README.md               (setup + run instructions for a judge/teammate)
├── client/
│   ├── src/
│   │   ├── pages/          (Landing, Login, Signup, Report, MapView, MyComplaints, ComplaintDetail, DepartmentDashboard)
│   │   ├── components/     (shared UI: ComplaintCard, StatusBadge, PriorityBadge, MapPin, Navbar, etc.)
│   │   ├── lib/             (api.js — axios instance, auth.js — token storage/helpers, constants.js — categories/departments)
│   │   ├── hooks/
│   │   ├── styles/
│   │   └── App.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── models/          (User.js, Complaint.js)
│   │   ├── routes/          (auth.js, complaints.js, meta.js)
│   │   ├── controllers/
│   │   ├── middleware/      (auth.js — verify JWT, requireRole.js)
│   │   ├── services/        (classification.js — Gemini call, phash.js, routing.js, sla.js, priority.js)
│   │   ├── config/          (db.js)
│   │   ├── scripts/         (seed.js)
│   │   ├── app.js           (Express app, mounts /api/*, serves client build as static in prod mode)
│   │   └── server.js        (entrypoint)
│   └── .env.example
└── package.json             (root — convenience scripts, see §11)
```

## 5. Data models

### User

```js
{
  _id,
  name: String,
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: String,
  role: { type: String, enum: ['citizen', 'department', 'admin'], default: 'citizen' },
  department: { type: String, enum: DEPARTMENTS, required: function() { return this.role === 'department' } },
  createdAt: Date
}
```

### Complaint

```js
{
  _id,
  reporter: { type: ObjectId, ref: 'User', required: true },

  photoUrl: String,          // Cloudinary secure_url
  photoPublicId: String,     // Cloudinary public_id
  pHash: String,             // 64-bit dHash, stored as a hex string

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number]    // [lng, lat] — GeoJSON order, don't flip this
  },

  category: { type: String, enum: CATEGORIES, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  aiConfidence: Number,       // 0–1, from Gemini
  categoryOverridden: Boolean,
  severityOverridden: Boolean,

  description: String,        // optional citizen note
  department: { type: String, enum: DEPARTMENTS, required: true }, // derived via routing table, can be reassigned

  status: { type: String, enum: ['New', 'Acknowledged', 'In Progress', 'Resolved'], default: 'New' },
  timestamps: {
    reported: Date,
    acknowledged: Date,
    inProgress: Date,
    resolved: Date
  },
  deadline: Date,              // set on Acknowledge, see §7
  resolutionNote: String,

  confirmations: { type: Number, default: 0 },
  confirmedBy: [{ type: ObjectId, ref: 'User' }],
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: ObjectId, ref: 'User' }],
  priorityScore: { type: Number, default: 0 },

  createdAt: Date,
  updatedAt: Date
}
```

Create a `2dsphere` index on `location` and a compound index on `{ department: 1, status: 1, priorityScore: -1 }` for the department queue query.

## 6. Categories, departments, and routing

18 categories across 5 departments. This table is the entire routing logic — a plain lookup, no ML:

| Department | Categories |
|---|---|
| **PWD** (Public Works) | `pothole`, `broken_footpath`, `damaged_road_divider`, `collapsed_culvert` |
| **SANITATION** | `garbage_overflow`, `illegal_dumping`, `uncollected_trash`, `blocked_drain` |
| **WATER_BOARD** | `pipe_leak`, `contaminated_water`, `sewage_overflow`, `manhole_issue` |
| **ELECTRICITY** | `streetlight_outage`, `exposed_wiring`, `damaged_transformer` |
| **TRAFFIC_POLICE** | `broken_traffic_signal`, `faded_road_marking`, `illegal_parking` |

If Gemini ever returns something outside this enum, default to `pothole` → PWD and let a human re-route via the department dashboard's override — never crash the create flow on an unexpected category.

## 7. Status lifecycle, SLA, and deadlines

Statuses: `New → Acknowledged → In Progress → Resolved`. Only a department/admin account can move a complaint forward; a citizen cannot self-resolve.

Deadline is auto-computed the moment a department clicks **Acknowledge** — never require manual date entry. Assign each category an urgency tier, then look up SLA days by tier + severity:

| Urgency tier | Categories | High | Medium | Low |
|---|---|---|---|---|
| **Safety-critical** | `exposed_wiring`, `damaged_transformer`, `broken_traffic_signal`, `manhole_issue`, `sewage_overflow`, `contaminated_water` | 1 day | 3 days | 7 days |
| **Standard infra** | `pothole`, `broken_footpath`, `damaged_road_divider`, `collapsed_culvert`, `pipe_leak`, `streetlight_outage` | 3 days | 7 days | 14 days |
| **Lower urgency** | `garbage_overflow`, `illegal_dumping`, `uncollected_trash`, `blocked_drain`, `faded_road_marking`, `illegal_parking` | 2 days | 5 days | 10 days |

`deadline = timestamps.acknowledged + SLA_DAYS[tier][severity]`. A department can override the computed deadline at acknowledge-time, but the auto-fill is the default and is the thing to demo.

**Overdue flag:** computed on read, not stored — if `status !== 'Resolved' && deadline < now`, render the status badge in the overdue/red state on both "My Complaints" and the department queue. Don't add a cron job for this; it's a display-time check.

## 8. Duplicate detection (dHash + proximity)

On complaint creation, **before** saving a new document:

1. Client uploads the photo directly to Cloudinary (unsigned preset) and gets back `{ secure_url, public_id }`.
2. Client sends `{ photoUrl, photoPublicId, lat, lng, description? }` to `POST /api/complaints`.
3. Server fetches the image bytes from `photoUrl`, uses `sharp` to resize to 9×8 grayscale, and computes a 64-bit **difference hash (dHash)**: for each row, compare each pixel to the one to its right; bit = 1 if left pixel is brighter. Store as a hex string.
4. Server runs Gemini classification (§9) to get `category` + `severity` (needed for the duplicate query, since duplicates must match category).
5. Server queries existing complaints where: `category` matches, `status !== 'Resolved'`, and `location` is within **50 meters** (`$geoNear` / `$near` with `maxDistance: 50`).
6. For each candidate, compute the Hamming distance between the new dHash and the candidate's dHash (popcount of XOR). If any candidate has Hamming distance **≤ 10** (out of 64 bits), it's a duplicate:
   - Do **not** create a new complaint document.
   - `$addToSet` the reporter into the matched complaint's `confirmedBy`, increment `confirmations`, recompute `priorityScore` (§10).
   - Return the existing complaint to the client with a `matched: true` flag so the UI can say "You've confirmed an existing report" instead of "Report created."
7. If no match, create the new complaint document normally.

This is a heuristic, not perfect duplicate detection — that's fine and expected for the demo. Don't over-engineer the threshold; 50m / Hamming ≤ 10 is the starting point, adjust only if testing shows it's clearly too loose or too strict.

## 9. AI classification (Gemini 2.5 Flash)

Use `@google/generative-ai`, model `gemini-2.5-flash`. Send the image (fetch the Cloudinary URL, pass as inline base64) with a prompt instructing the model to return **only** JSON matching this shape — use Gemini's `responseMimeType: "application/json"` and a `responseSchema` so you get guaranteed structured output, not a string to parse by hand:

```json
{ "category": "<one of the 18 category enum values>", "severity": "low | medium | high", "confidence": 0.0-1.0 }
```

Include the exact category enum list in the prompt so the model's output always maps cleanly onto the schema. Store `aiConfidence`. Both the reporter (at creation) and the department (at acknowledge/triage) can override `category`/`severity` manually — set `categoryOverridden` / `severityOverridden` accordingly. This override path matters: it's your safety net if the model misclassifies something live during the demo.

## 10. Priority score

Stored directly on the document, recomputed on every upvote/confirmation — don't run an aggregation on read:

```
priorityScore = severityWeight(severity) * 10 + confirmations * 3 + upvotes * 1
severityWeight: low = 1, medium = 2, high = 3
```

Department queues sort by `priorityScore` descending by default.

## 11. Upvoting vs. confirmations — keep these distinct

- **Confirmation** happens automatically when someone *reports* the same issue and it's matched as a duplicate (§8). It means "I also just independently reported this."
- **Upvote** happens when someone is *browsing* the map/list (not filing a new report) and taps upvote on an existing pin within their **2.5km** radius. It means "I care about this one too."

Both feed the same `priorityScore`, but keep them as separate fields (`confirmations` vs `upvotes`) and separate UI affordances — don't merge them into one button. Prevent double-upvoting with `$addToSet` on `upvotedBy` (Mongo silently no-ops a duplicate); use this to also grey out the upvote button client-side for a user who's already voted.

## 12. API contract

**Auth**
- `POST /api/auth/signup` — citizen signup only (`role` is always forced to `'citizen'` server-side, ignore any role in the request body)
- `POST /api/auth/login` — works for all roles (citizen, department, admin — department/admin accounts are pre-seeded, not self-service)
- `GET /api/auth/me` — return current user from JWT

**Complaints**
- `POST /api/complaints` — auth required (citizen). Body: `{ photoUrl, photoPublicId, lat, lng, description? }`. Runs dHash + classification + duplicate check per §8.
- `GET /api/complaints/public` — no auth. Returns all complaints (all statuses) with fields safe for public display — omit reporter's email, include everything else. Powers the public landing map.
- `GET /api/complaints/nearby?lat=&lng=&radius=` — no auth required to view; upvote action within the response requires auth on the client side (show a login prompt if not authenticated).
- `GET /api/complaints/mine` — auth required. Reporter's own complaints, all statuses.
- `POST /api/complaints/:id/upvote` — auth required (citizen).
- `GET /api/complaints/department?status=&sort=` — auth required (`department` or `admin` role). A `department`-role user is scoped server-side to their own department regardless of query params; `admin` can pass `?department=` to filter or omit it to see all.
- `PATCH /api/complaints/:id/status` — auth required (`department`/`admin`). Body: `{ status, resolutionNote?, categoryOverride?, severityOverride?, deadlineOverride? }`. Setting `status: 'Acknowledged'` auto-computes `deadline` per §7 unless `deadlineOverride` is provided.

**Meta**
- `GET /api/meta/categories` — returns the category list, category→department map, and severity options, so the frontend never hardcodes this table twice.

## 13. Frontend pages

- `/` — public landing: a hero that states what the app does, a live preview of the public map, a "Report an Issue" CTA, and login/signup entry points. No login wall.
- `/login`, `/signup` — citizen-facing (department/admin accounts log in via the same `/login` form; the form doesn't need to know the difference, the server returns role in the JWT payload and the frontend routes post-login based on that).
- `/report` — the creation flow: camera/file input → auto geolocation → optional description → submit. Auth required.
- `/map` — public browsable map + list, filterable by category/status. Upvote buttons visible to everyone; tapping one while logged out prompts login rather than failing silently.
- `/my-complaints` — citizen's own reports as cards: photo thumbnail, category, status badge, deadline countdown once acknowledged, flips to an overdue state if past deadline. Auth required.
- `/complaints/:id` — detail view, publicly readable (so a report is shareable), action buttons only rendered for roles permitted to use them.
- `/department` — split-screen dashboard: map on one side, priority-sorted list on the other, clicking a list row pans the map and vice versa. Filter tabs by department (admin sees all + a combined view; a department-role account only ever sees their own, no tab needed for them). Inline Acknowledge / In Progress / Resolve actions from the map popup or list row. Auth required, `department`/`admin` role only.

## 14. Design system

The base is fixed by the brief: **near-black background, off-white/white text, shadcn/ui, no emoji, no generic AI-dashboard look.** Within that, ground every other choice in the actual subject — municipal fieldwork, utility-locate flags, work-order tickets — rather than a generic dark dashboard. Concretely:

**Palette**
- Background: `#0B0B0D` (page), `#151519` (raised surface/card)
- Text: `#F2F1ED` primary, `#8B8D93` muted/secondary
- Signature accent: a saturated safety/utility-flag orange, `#FF5A1F` — used sparingly (primary CTA, active nav state, the "New" status). This is a deliberate departure from the near-black-plus-neon-green/vermilion combo that's become a generic AI-app tell — this orange is pulled from utility-locate flags and road-hazard marking, which is literally the subject matter of the app.
- Status colors (these ARE meaningfully informative, not decorative — keep them): New = slate blue `#5B7DB1`, Acknowledged = amber `#E8A83C`, In Progress = blue `#3B82C4`, Resolved = green `#4E9F6B`, Overdue = red `#E5484D`
- Severity colors: Low `#4E9F6B`, Medium `#E8A83C`, High `#E5484D`

**Typography** — use the IBM Plex family throughout (free via Google Fonts, and it's genuinely apt: designed for technical/engineered contexts, not the generic Inter-everywhere default):
- Display/headings: IBM Plex Sans, medium/semibold weights
- Body: IBM Plex Sans, regular
- Data — timestamps, GPS coordinates, complaint IDs, SLA countdowns: **IBM Plex Mono**. Rendering a complaint ID as `CP-000142` in monospace is the small detail that sells "this is a real tracking system," not a toy.

**Signature element — the work-order ticket.** Every complaint card (in "My Complaints," in the department queue, in the detail view) reads visually like a municipal service ticket: a monospace ticket ID, a stamped-looking status badge (solid fill, not a soft pill-with-dot), and a thin dashed rule where a tear-off perforation would be on a physical work order. This is the one place to spend visual boldness — keep everything else quiet and disciplined around it.

**Shape & structure**
- Sharp-ish corners (2–4px radius), not shadcn's default rounded-2xl everywhere — reinforces the "official document" feel over "friendly SaaS app" feel
- Map pins: a flag/marker shape (not a plain circle), color-filled by category, with a small lucide icon at the center matching the category (wrench for PWD, droplet for water, bolt for electricity, etc.)
- Minimal motion: a status badge can transition its fill color on update; skip scroll-triggered animation and hover effects beyond standard shadcn button/link states — this is a utilitarian ops tool, not a marketing site

**Icons:** `lucide-react` — it ships natively with shadcn, has a consistent stroke weight that matches the technical/schematic tone above, and needs no extra dependency. (If a more literal "Google" icon look is wanted instead, swap for Material Symbols — but lucide is the default here and the better fit for the palette/type direction.)

**Copy voice:** plain, active-voice, addressed to what the person is doing — "Report an issue," "Confirm you've seen this," "Mark resolved," never vague ("Submit," "Process request"). Empty states are an invitation to act ("No reports near you yet — be the first"), not an apology. Errors say exactly what happened and what to do about it.

## 15. Seed data

`server/src/scripts/seed.js`, run once before demoing:

**Accounts** (documented here since this is local demo data, not production credentials):

| Email | Password | Role |
|---|---|---|
| `pwd@civicpulse.demo` | `Password123!` | department (PWD) |
| `sanitation@civicpulse.demo` | `Password123!` | department (SANITATION) |
| `water@civicpulse.demo` | `Password123!` | department (WATER_BOARD) |
| `electricity@civicpulse.demo` | `Password123!` | department (ELECTRICITY) |
| `traffic@civicpulse.demo` | `Password123!` | department (TRAFFIC_POLICE) |
| `admin@civicpulse.demo` | `Password123!` | admin |

**Complaints:** generate ~40 synthetic complaints scattered within roughly a 5km radius of a configurable city-center point (default to Hyderabad, `17.3850, 78.4867` — override via `CITY_CENTER_LAT` / `CITY_CENTER_LNG` env vars if demoing elsewhere). Vary category, severity, status (mix of all four statuses, including a few intentionally overdue), and `reported` timestamps spread across the past ~3 weeks so the map and department queues don't look freshly created. A handful should have `confirmations`/`upvotes` > 0 so the priority sort visibly does something on first load.

## 16. Environment variables

`server/.env.example`:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/civicpulse
JWT_SECRET=replace-with-a-long-random-string
GEMINI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
CITY_CENTER_LAT=17.3850
CITY_CENTER_LNG=78.4867
```

`CLOUDINARY_UPLOAD_PRESET` must be an **unsigned** preset (create it in the Cloudinary dashboard under Settings → Upload → Upload presets → set signing mode to Unsigned) — the client uploads straight to Cloudinary with this preset name, no API secret ever reaches the browser.

## 17. Running locally + the ngrok demo setup

Two modes:

**Dev mode** (while building): run `client` via Vite dev server (hot reload) with a proxy to the Express API, and `server` via `nodemon` separately. Fast iteration, not what you demo with.

**Demo mode** (what you actually run on stage): build the client and serve it as static files from the same Express server that serves the API, so there's exactly one port and zero CORS surface:

```
npm run build     # builds client/, copies client/dist → server/public
npm start         # starts Express on PORT, serving both /api/* and the static app
ngrok http 4000   # one tunnel, one public URL
```

Open that ngrok URL on the phone (sign up as a citizen there) and on the laptop (log in with a department/admin seed account there). Because it's ngrok, the phone doesn't even need to share WiFi with the laptop — useful if venue WiFi is unreliable; put the phone on mobile data if needed.

Root `package.json` should provide: `dev:client`, `dev:server`, `build`, `start`, `seed` scripts wrapping the above.

## 18. Suggested build order (2 people, 3–4 days)

- **Day 1:** Repo scaffold, Mongo models, auth (signup/login/JWT middleware/role gating), seed script skeleton. In parallel: frontend scaffold, routing, dark theme + type system wired up in Tailwind/shadcn config, Navbar, Landing page shell.
- **Day 2:** Report flow end-to-end — Cloudinary unsigned upload, geolocation capture, dHash computation, Gemini classification call, duplicate-merge logic, complaint creation API. Frontend: Report page, My Complaints page.
- **Day 3:** Department dashboard (map + list + triage actions + status lifecycle + SLA deadline computation + overdue flag), public Map/List view, upvote flow, priority score. Run the seed script and eyeball that 40 seeded complaints look like a lived-in map.
- **Day 4:** Design pass against §14 (this is where "generic AI slop" gets caught and fixed), empty/error states, full run-through on an actual phone over ngrok, fix whatever breaks off-laptop, rehearse the demo script.

## 19. Explicitly out of scope — do not build these

- Cloud deployment of any kind
- A vector database (dozens of documents — compare pHash values in application code)
- Real CLIP/embedding-based similarity
- Native mobile app — this is a responsive web app only
- WebSockets or any real-time push — polling/manual refresh only
- Real municipal system integration — the department names are just enum values
- Multilingual UI (stretch goal only, skip for MVP)
- Email/SMS notifications on status change (stretch goal only, skip for MVP)
- Photo-proof requirement on resolution (a text `resolutionNote` is sufficient)
- Self-service department account creation/onboarding UI — 5 accounts + 1 admin are seeded once, that's it
- Automated test suite — verify manually against §20 below; don't spend hackathon time on test infrastructure

## 20. Verification checklist

Before considering a feature done, confirm:

- [ ] Signup → login → JWT persists across refresh → logout all work
- [ ] Reporting an issue from a phone (real GPS, real camera) produces a classified, geotagged complaint within a few seconds
- [ ] Reporting the *same* pothole twice (same spot, same category) merges as a confirmation, not a second pin
- [ ] The department dashboard, logged in as `pwd@civicpulse.demo`, shows only PWD-routed complaints, sorted by priority
- [ ] The `admin` account sees all departments with working filter tabs
- [ ] Clicking Acknowledge sets a deadline automatically per the SLA table in §7, with no manual date entry
- [ ] A complaint whose deadline has passed and isn't Resolved renders in the overdue state, everywhere it appears
- [ ] Upvoting from a second account increases `priorityScore` and re-sorts the department queue
- [ ] The public `/map` and landing page are viewable with zero login
- [ ] The whole thing works end-to-end through the ngrok URL on a phone on mobile data, not just on localhost