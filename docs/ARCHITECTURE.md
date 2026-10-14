# System Architecture & Technical Specification

## Overview

The Face Recognition Attendance System is an enterprise-grade biometric attendance web application. It operates under a strict Zero-Student-Account, Admin-Controlled paradigm where face detection occurs locally in the client browser, while biometric matching and attendance commits execute server-side in secure Vercel Serverless Functions.

---

## 1. High-Level Component Diagram

```
+-----------------------------------------------------------------------------------+
| CLIENT BROWSER                                                                    |
|                                                                                   |
|  [Public Kiosk Page]                         [Admin Dashboard & Management]      |
|  - WebGL / CPU Face Landmark Engine           - React Hook Form + Yup             |
|  - 128-D Face Descriptor Extractor            - Live Firestore Listeners          |
|  - 8-D Eye Geometry Ratio Calculator          - Local Media Compressors (<500KB)  |
|  - Client Liveness & Motion Guard             - Cinematic Movie View Carousel     |
|          |                                              |                         |
+----------|----------------------------------------------|-------------------------+
           | POST /api/attendance/mark                    | Bearer Admin ID Token
           | (Vector only, no raw frames)                 | (Firebase Auth)
           v                                              v
+-----------------------------------------------------------------------------------+
| VERCEL SERVERLESS PLATFORM (/api)                                                 |
|                                                                                   |
|  api/_lib/auth.js          -> Validates Admin Firebase ID Token & claims          |
|  api/_lib/match.js         -> In-memory student mean descriptor Euclidean match   |
|  api/_lib/time.js          -> Asia/Kolkata timezone session & late-time evaluation|
|  api/_lib/validate.js      -> Strict server-side Yup schema validation            |
|                                                                                   |
|  api/attendance/mark.js    -> Atomic attendance recording (Firestore transaction) |
|  api/media/upload-image.js -> Enforces <512KB payload & proxies to ImgBB          |
|  api/chat/index.js         -> Tool-calling AI assistant loop                      |
+----------|----------------------------------------------|-------------------------+
           |                                              |
           | Firebase Admin SDK                           | HTTPS REST API
           v                                              v
+-------------------------------+             +-------------------------------------+
| GOOGLE CLOUD FIRESTORE        |             | IMGBB HOSTING                       |
|                               |             |                                     |
| - students/{studentId}        |             | Compressed Profile Photos           |
| - signatures/{studentId}      |             | (Strictly under 500KB)              |
| - attendance/{recordId}       |             +-------------------------------------+
| - rollIndex/{rollNo}          |
| - settings/{system|theme}     |
| - media/{mediaId}             |
+-------------------------------+
```

---

## 2. Biometric Signature Pipeline

To remain technically honest and accurate, the system avoids claiming "iris recognition" (which necessitates near-infrared sensors), and instead implements a **Dual-Signal Face and Eye Signature**:

1. **Face Descriptor Vector (128 dimensions)**:
   - Extracted by `faceRecognitionNet` (ResNet-34 based deep metric model).
   - Normalized and rounded to 4 decimal places to reduce network bandwidth.
   - Primary metric: Euclidean distance $\sqrt{\sum (A_i - B_i)^2}$.
   - Default acceptance threshold: `0.45` (configurable from 0.30 to 0.60).

2. **Eye-Region Geometry Vector (8 dimensions)**:
   - Extracted from 68 landmarks after roll-angle correction (leveling the inter-ocular axis).
   - Normalized relative to inter-ocular distance $D = \|C_{left\_eye} - C_{right\_eye}\|$:
     1. $w_{left} / D$ (Left eye width ratio)
     2. $w_{right} / D$ (Right eye width ratio)
     3. $h_{left} / D$ (Left eye height ratio)
     4. $h_{right} / D$ (Right eye height ratio)
     5. $d_{left\_eye \to left\_brow} / D$
     6. $d_{right\_eye \to right\_brow} / D$
     7. $d_{eye\_mid \to nose\_tip} / D$
     8. $d_{left\_eye \to nose\_tip} / d_{right\_eye \to nose\_tip}$ (Bilateral facial symmetry ratio)
   - Secondary verification: Mean Absolute Error (MAE) must be within `0.08` tolerance.

---

## 3. Recognition & Attendance Sequence Diagram

```
Student            Kiosk (Browser)              /api/attendance/mark             Cloud Firestore
   |                      |                               |                             |
   |--- Stood in view --->|                               |                             |
   |                      |-- Detect face & 68 landmarks -|                             |
   |                      |-- Check Quality (size, sharp) |                             |
   |                      |-- Liveness (blink / motion)---|                             |
   |                      |-- Average 3 stable vectors ---|                             |
   |                      |                               |                             |
   |                      |--- POST /api/attendance/mark ->|                            |
   |                      |    { descriptor, eye, ... }   |-- Fetch cached signatures ->|
   |                      |                               |-- Compute distances --------|
   |                      |                               |-- Top candidate <= 0.45? ---|
   |                      |                               |-- Margin to 2nd >= 0.06? ---|
   |                      |                               |-- Eye MAE <= 0.08? ---------|
   |                      |                               |                             |
   |                      |                               |-- Check Active Session -----|
   |                      |                               |   (Asia/Kolkata time)       |
   |                      |                               |                             |
   |                      |                               |-- Transaction: Write doc ---|
   |                      |                               |   ID: YYYY-MM-DD_sess_id    |
   |                      |                               |<- Commit result ------------|
   |                      |<-- 200 OK --------------------|                             |
   |                      |    { matched: true, name,     |                             |
   |                      |      status: 'late',          |                             |
   |                      |      lateMinutes: 12 }        |                             |
   |                      |                               |                             |
   |<- Display Card ------|                               |                             |
   |   (Audio chime +     |                               |                             |
   |    late message)     |                               |                             |
```

---

## 4. Deterministic Attendance Key Design

Attendance record IDs are guaranteed unique and idempotent by design:
$$\text{recordId} = \$\{dateKey\}\_\$\{session\}\_\$\{studentId\}$$
Example: `2026-10-13_morning_std_abc123`

This architecture mathematically prevents accidental double-marking within the same session, even under concurrent network retries or multiple kiosk terminals.
