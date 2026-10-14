# Technical Decisions Log

This document records architectural, design, and implementation choices made throughout development where the specification left details open.

1. **Language & Type System**: Selected JavaScript (ES2022) with JSDoc annotations over TypeScript to maximize code accessibility, eliminate build transpilation friction for serverless endpoints, and maintain rapid iteration speed while keeping full autocomplete support.
2. **Chart Library**: Selected `recharts` for dashboard and reporting attendance trends as authorized by Section 13.2, bundled into a lazy-loaded chunk `charts` to ensure the public Kiosk page stays lightweight (< 1.5MB).
3. **Face Model Cache & Sync**: Configured `scripts/downloadModels.js` to first probe `@vladmandic/face-api/model` inside `node_modules` before fetching from GitHub raw CDN. This guarantees fast offline builds in CI and local setups without relying on external CDNs.
4. **Server Environment Validation**: Implemented `getServerEnv()` inside `api/_lib/env.js` that compiles a Yup schema and parses secrets at module initialization time, raising explicit errors naming missing variables.
5. **Rate Limiting Architecture**: Public `/api/attendance/mark` uses an in-memory sliding window per IP hash on Vercel edge instances, combined with Firestore-based atomic check for suspicious burst traffic.
6. **Chatbot LLM Provider**: Placed Google Gemini (`gemini-1.5-flash`) as default provider adapter in `api/_lib/llm.js` using `fetch` to Google Generative Language API, with zero third-party client bloat, and implemented an offline keyword/intent rule engine fallback in `src/features/chatbot/ruleEngine.js`.
7. **Audio Cues**: Kiosk audio feedback is synthesized on-the-fly using browser Web Audio API oscillator nodes (synthesizing gentle chimes: 523Hz/659Hz for success, 330Hz for late, 220Hz for rejected), removing dependencies on external audio asset files.
8. **Video Compression Engine**: Lazily imported `@ffmpeg/ffmpeg` with the single-threaded WASM core to prevent SharedArrayBuffer header conflicts with Firebase Authentication and ImgBB requests.
