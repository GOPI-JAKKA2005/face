# FaceAttend: Biometric Face Recognition Attendance System

A production-grade, zero-student-login biometric attendance web application engineered with React 18, Vite, Tailwind CSS, Cloud Firestore, and Vercel Serverless Functions.

Operating under an administrative control paradigm, FaceAttend provides automated kiosk check-ins powered by in-browser computer vision (@vladmandic/face-api), Euclidean distance matching, anti-spoofing liveness verification, dynamic theme styling, and an AI-driven operations assistant.

---

## Technical Architecture & Design Decisions

### 1. Honest Biometric Architecture: Face & Eye Signature
- **Honest Biometrics**: True iris recognition requires near-infrared illumination and specialized physical sensors. Standard mobile or webcam optics cannot capture iris crypts or collarette structures reliably.
- Rather than making false claims in the UI, this application implements a **Dual-Signal Face and Eye Signature**:
  1. A 128-dimensional deep face descriptor extracted via deep residual convolutional networks.
  2. An 8-dimensional normalized eye-region geometry vector derived from 68 facial landmarks (inter-ocular width/height ratios, eyebrow distances, and bilateral symmetry).
- Secondary verification rejects close false positives using eye-geometry tolerance gates.

### 2. Privacy & Server-Side Security Model
- **Zero Raw Frames Uploaded**: All face detection and landmarking runs locally inside the browser. Raw video frames are never streamed or persisted. Only numeric descriptor arrays and an optional compressed profile photo are transmitted.
- **Serverless Biometric Matching**: Candidate matching executes exclusively on Vercel Serverless Functions using the Firebase Admin SDK. The public kiosk terminal cannot read stored student vectors.
- **Deterministic Record IDs**: Attendance IDs follow the formula `${dateKey}_${session}_${studentId}` (e.g. `2026-10-13_morning_std_123`). This makes accidental duplicate marking impossible by construction.

---

## Core Features

- 🖥️ **Distraction-Free Kiosk Mode (`/kiosk`)**: Designed for entrance tablets. Real-time timezone clock, session indicators, Web Audio chimes, and instant lateness calculations.
- 📸 **Two-Step Biometric Enrollment (`/admin/enroll`)**: 8-sample automated capture wizard with live quality meters (lighting, face size, eyes open, head yaw) and real-time duplicate face prevention.
- ⏱️ **Session & Lateness Engine**: Configurable morning and afternoon sessions with grace periods and cutoffs. Calculates exact lateness (e.g., *"You are late by 13 minutes"*).
- 🗂️ **Students Directory (`/admin/students`)**: Search, call links, activation switches, and individual 90-day attendance heatmaps.
- 📊 **Analytics & Reporting (`/admin/reports`)**: Punctuality leaderboards, lateness distribution charts, printable reports, and UTF-8 BOM CSV exports.
- 🎨 **Theme & Branding Studio (`/admin/themes`)**: 8 WCAG 4.5:1 accessible presets (Indigo, Ocean, Emerald, Sunset, Rose, Slate, Midnight, High Contrast), real-time CSS variable manipulation, and token export.
- 🗜️ **500 KB Media Ceiling**: Guaranteed in-browser image and video compression (< 500 KB) via `browser-image-compression` and WebAssembly FFmpeg.
- 🎬 **Cinematic Movie View (`/admin/movie`)**: Letterboxed media showcase with Swiper Coverflow carousel, video controls, and live Attendance Reel.
- 🤖 **Admin AI Assistant (`/admin/chat`)**: Tool-calling assistant that answers attendance questions, audits logs, and presents structured confirmation cards for action proposals.

---

## Technical Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, Vite (ES2020) |
| **Routing** | React Router v6.4+ (createBrowserRouter, lazy routes) |
| **Styling** | Tailwind CSS with runtime CSS variable design tokens |
| **Forms & Validation** | React Hook Form, Yup schemas |
| **Computer Vision** | @vladmandic/face-api (TinyFaceDetector, FaceLandmark68, FaceRecognitionNet) |
| **Compression** | `browser-image-compression` (images), `@ffmpeg/ffmpeg` (WASM videos) |
| **Backend & API** | Node.js Serverless Functions on Vercel (`/api`) |
| **Database & Auth** | Google Cloud Firestore, Firebase Authentication |
| **Testing** | Vitest unit test suite |

---

## Environment Variables Configuration

FaceAttend strictly segregates client and server environment files to prevent secret leakage:

### 1. Client Environment (`.env.local` or `.env.client`)
Public variables exposed to Vite (prefixed with `VITE_`):
```ini
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_API_BASE_URL=/api
VITE_APP_NAME=FaceAttend
VITE_DEFAULT_TIMEZONE=Asia/Kolkata
VITE_MODEL_URL=/models
VITE_MAX_MEDIA_KB=500
```

### 2. Server Environment (`.env.server`)
Confidential secrets utilized exclusively by `/api` functions and administrative maintenance scripts:
```ini
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_EMAILS=admin@example.com
IMGBB_API_KEY=your_imgbb_key
CHAT_PROVIDER_API_KEY=your_gemini_api_key
CHAT_MODEL=gemini-1.5-flash
MATCH_THRESHOLD_DEFAULT=0.45
KIOSK_RATE_LIMIT_PER_MIN=30
APP_TIMEZONE=Asia/Kolkata
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Setup and Development Guide

### Prerequisites
- Node.js v18.0.0 or higher (v20+ recommended)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Sync Face Recognition Models
Syncs the neural weight binaries into `public/models/`:
```bash
npm run models
```

### 3. Verify Environment Configuration
Verifies both environment files contain required keys and warns if client variables expose sensitive terms:
```bash
npm run check:env
```

### 4. Create Initial Administrator User
Generates the administrative Firebase Auth user and assigns the `admin: true` custom claim:
```bash
npm run admin:create admin@yourdomain.com StrongAdminPassword123!
```

### 5. Run Automated Unit Tests
```bash
npm run test
```

### 6. Local Development
```bash
# Start both Backend Server (port 5000) and Frontend Client (port 5173) concurrently:
npm run dev

# Or run frontend and backend individually:
npm run dev:client  # Runs Vite frontend from client/ (port 5173)
npm run dev:server  # Runs Express API backend from server/ (port 5000)
```

---

## Repository Structure (`client/` & `server/`)

```
face-attend/
├── client/                     # Frontend Application (React 18, Vite, Tailwind CSS)
│   ├── src/                    # App shell, components, routes, features, and hooks
│   ├── public/                 # Static assets, favicon, neural model weights (/models)
│   ├── index.html              # Frontend entry HTML
│   ├── vite.config.js          # Vite config with manual chunking & API proxy to port 5000
│   ├── tailwind.config.js      # CSS token variable system
│   ├── package.json            # Client frontend dependencies
│   └── .env                    # Client environment file (VITE_* variables)
│
├── server/                     # Backend Application (Express & Vercel Functions)
│   ├── api/                    # Serverless routes & biometric algorithms (_lib/)
│   ├── scripts/                # Maintenance, seeding, and admin creation scripts
│   ├── server.js               # Standalone Express server on port 5000
│   ├── package.json            # Server backend dependencies
│   └── .env                    # Server environment file (secrets & Firebase Admin SDK)
│
├── cilent/                     # Direct junction link to client/
├── docs/                       # Architectural decisions, testing, and deployment specs
├── tests/                      # Automated Vitest unit test suite
└── package.json                # Root orchestrator scripts (dev, build, lint, test)
```

---

## Production Deployment to Vercel

1. Push your repository to GitHub.
2. Import into [Vercel](https://vercel.com).
3. Select **Vite** framework preset.
4. Add all **Client Variables** and **Server Variables** in **Project Settings > Environment Variables**.
5. Paste the Firestore Security Rules from `docs/DEPLOY.md` into the Firebase Console.
6. Deploy!

---

## Data Privacy, Retention & Honest Limitations

### Privacy & Consent Notice
Biometric data collection is restricted strictly to enrolled students. Prior to saving any profile, the administrator must confirm informed biometric consent. A one-click delete option purges the student, signature vector, and profile media while anonymizing historical logs.

### Honest Limitations
1. **Physical Spoofing**: Browser-based webcam liveness checks (eye blinks and micro-movements) reject printed still photos and basic phone screenshots. However, they cannot achieve 100% defense against high-definition video replays or deepfake streams without specialized 3D depth sensors or near-infrared cameras.
2. **Twins & Lookalikes**: Very similar faces or identical twins may score within the default 0.45 Euclidean threshold. Use the ambiguity margin and stricter thresholds in Recognition Settings to mitigate this.
3. **Lighting & Shadows**: Extreme backlighting or heavy facial occlusions (sunglasses, masks) degrade landmark triangulation. The app prompts users to adjust their position when quality checks fail.
