# CivicPulse — Build Decisions

Judgment calls made during implementation:

## 1. Ticket ID format
Used last 6 hex chars of MongoDB ObjectId modulo 1M to generate `CP-XXXXXX` ticket IDs via a Mongoose virtual. Not globally unique across large datasets, but sufficient for the demo scale (~40-100 documents).

## 2. Cloudinary upload — client-side env vars
Cloudinary cloud name and upload preset are exposed to the client via Vite env vars (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`). This is intentional — the unsigned preset is designed for client-side use and carries no secret.

## 3. Dark map tiles
Used CartoDB dark_all tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) instead of default OpenStreetMap tiles to match the dark theme. No API key required.

## 4. dHash — graceful fallback
If dHash computation fails (e.g., image fetch error), the complaint is created without duplicate detection rather than blocking the create flow.

## 5. Gemini fallback
If Gemini classification fails entirely, default to `pothole` / `medium` / confidence 0. Never crash the create flow on AI failure.

## 6. Resolution note via browser prompt
Department dashboard uses `window.prompt()` for the resolution note on "Mark resolved" — simple but functional for the hackathon. A modal would be better for production.

## 7. React 19 compatibility
Vite scaffolded React 19 instead of React 18 — React 19 is backwards compatible and works fine with all our dependencies. No action needed.

## 8. Tailwind CSS v4
Vite installed Tailwind CSS v4 with the `@tailwindcss/vite` plugin. Using `@theme` directive for design tokens instead of the v3 `tailwind.config.js` approach.
