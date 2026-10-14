# Comprehensive Manual & Automated Testing Guide

## 1. Automated Unit Tests (Vitest)

Execute automated unit tests:
```bash
npm run test
```

The test suite covers:
- **api/_lib/time.js**:
  - Exact on-time arrival handling
  - Arrival inside grace window
  - 1 minute after grace window
  - Cutoff violation
  - Both `lateCountsFrom: 'start'` and `lateCountsFrom: 'afterGrace'` calculation modes
  - Second-level rounding (ceil to next whole minute)
  - Timezone conversion over midnight UTC -> IST (e.g., 23:30 UTC is next day in IST)
  - Active session selection across all segments of the day
- **api/_lib/match.js**:
  - Euclidean distance scoring
  - Ambiguity margin rejection (second-best candidate too close)
  - Confidence calculation clamp between 0.0 and 1.0
- **api/_lib/eye.js**:
  - Eye geometry 8-vector calculation with synthetic landmark points
  - Head roll angle rotational normalization
- **Image Compression**:
  - Max size guarantees (<500KB) and fallback loop termination
- **Yup Validation Schemas**:
  - Valid and malformed input scenarios for students, sessions, recognition, and manual marks.

---

## 2. Manual Acceptance Scenarios

### Scenario 1: Student Enrollment Workflow
1. Navigate to `/admin/enroll` as authenticated admin.
2. Allow camera access. Align face in the oval guide.
3. Observe progress ring (1 to 5 frontal frames, then prompts to turn slightly left, then slightly right for frames 6-8).
4. Verify Quality Indicators (lighting, face size, eyes open, head pose) show green.
5. After 8 samples, check that Step 2 unlocks.
6. Enter name, roll number, and 10-digit mobile number.
7. Tick biometric consent checkbox and click **Save Student**.
8. Confirm success animation and verify student document in Firestore.

### Scenario 2: On-Time Attendance Scan
1. Open `/kiosk` on a mobile device, tablet, or secondary browser window.
2. Enrolled student steps into view of the camera.
3. Observe recognition overlay transition: "Looking for face" -> "Hold still" -> "Recognised".
4. Result card appears: displays student name, roll number, morning session badge, and "On time, welcome".
5. Audio chime plays and scanning resumes after cooldown.

### Scenario 3: Lateness Calculation
1. Set Morning session start time to 12 minutes prior to current server time in `/admin/settings`.
2. Present student face to `/kiosk`.
3. Result card displays amber "Late" badge and message: `"You are late by 12 minutes"`.
4. Verify attendance record in Firestore contains `status: 'late'` and `lateMinutes: 12`.

### Scenario 4: Duplicate Scan Prevention in Same Session
1. Immediately re-present the same student face to `/kiosk` within the same session.
2. Result card displays `"Already marked present at HH:mm (morning)"`.
3. Check Firestore to verify no duplicate attendance document was created.

### Scenario 5: Multi-Session Separation
1. Transition or configure afternoon session.
2. Present student face during afternoon session hours.
3. A distinct record for afternoon session is created without overwriting morning data.

### Scenario 6: Unenrolled Stranger Rejection
1. An unenrolled person stands in front of `/kiosk`.
2. Result card shows `"Face not recognised. Please contact your administrator."`
3. Verify no attendance document is written.

### Scenario 7: Anti-Spoofing Liveness Verification
1. Present a printed still photo or phone screenshot of an enrolled student.
2. When `requireLiveness: true`, the system requires an authentic eye blink (EAR drop below 0.18 and recovery) and micro-movement.
3. The photo fails liveness gate and attendance is not recorded.

### Scenario 8: Dynamic Settings Propagation
1. Change morning start time in `/admin/settings`.
2. Observe `/kiosk` poll config and update its session indicator.
3. Verify existing attendance records retain their snapshotted scheduled start times.

### Scenario 9: 500 KB Media Compression Ceiling
1. Upload a 6 MB JPG in `/admin/media` or `/admin/enroll`.
2. Confirm compression status reads under 500 KB before upload is allowed.
3. Upload a sample MP4 video; verify client FFmpeg encodes under 500 KB ceiling.

### Scenario 10: Dynamic Theme Customization
1. Navigate to `/admin/themes` and select the "Emerald" or "Ocean" preset.
2. Customize Primary and Accent colors.
3. Confirm instant application without full reload.
4. Refresh browser and confirm theme persists from `localStorage`.
5. Open `/kiosk` and verify themed colors propagate.

### Scenario 11: Route Protection & Session Expiry
1. Click **Sign Out** in Admin Shell.
2. Try accessing `/admin/dashboard`, `/admin/students`, `/admin/settings`.
3. Verify immediate redirection to `/admin/login`.
4. Verify `/kiosk` remains fully operational.

### Scenario 12: Mobile Viewport Responsiveness (360px)
1. Set viewport to 360px width in Chrome DevTools.
2. Verify bottom navigation bar renders with touch targets >= 44x44px.
3. Confirm tables convert to card stacks and no horizontal scrollbar appears.

### Scenario 13: Admin AI Assistant
1. Open Chatbot panel via launcher icon or `/admin/chat`.
2. Ask `"Who was late this morning?"` and verify accurate summary.
3. Ask `"Set morning start to 09:15"` and verify action proposal card with **Confirm** and **Cancel** buttons.
