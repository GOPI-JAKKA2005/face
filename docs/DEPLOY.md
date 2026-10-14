# Production Deployment Guide: Firebase & Vercel

This guide outlines end-to-end instructions for deploying FaceAttend to Firebase and Vercel.

---

## 1. Firebase Project Setup

### Step 1: Create Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project (e.g., `face-attend-prod`). Disable Google Analytics if not needed.

### Step 2: Enable Firebase Authentication
1. Go to **Authentication** > **Get Started**.
2. Under **Sign-in method**, enable **Email/Password**. Leave Email link disabled.

### Step 3: Create Cloud Firestore Database
1. Go to **Firestore Database** > **Create database**.
2. Select **Production mode**.
3. Choose a region close to your primary users (e.g., `asia-south1` for Mumbai/India).

### Step 4: Configure Firestore Security Rules
Go to **Firestore Database** > **Rules** tab, replace with the following locked configuration, and click **Publish**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    match /signatures/{id} { allow read, write: if false; }
    match /rollIndex/{id}  { allow read, write: if false; }
    match /chatLogs/{id}   { allow read, write: if false; }
    match /students/{id}   { allow read: if isAdmin(); allow write: if false; }
    match /attendance/{id} { allow read: if isAdmin(); allow write: if false; }
    match /media/{id}      { allow read: if isAdmin(); allow write: if false; }
    match /settings/{id}   { allow read: if isAdmin(); allow write: if false; }
    match /{document=**}   { allow read, write: if false; }
  }
}
```

### Step 5: Configure Composite Indexes
Go to **Firestore Database** > **Indexes** tab and create the following composite indexes:

1. **Collection**: `attendance`
   - Fields: `dateKey` (Ascending), `session` (Ascending), `markedAt` (Descending)
2. **Collection**: `attendance`
   - Fields: `studentId` (Ascending), `dateKey` (Descending), `markedAt` (Descending)
3. **Collection**: `students`
   - Fields: `active` (Ascending), `name` (Ascending)

Or deploy via `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dateKey", "order": "ASCENDING" },
        { "fieldPath": "session", "order": "ASCENDING" },
        { "fieldPath": "markedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "studentId", "order": "ASCENDING" },
        { "fieldPath": "dateKey", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Step 6: Generate Service Account Key
1. Go to **Project Settings** (gear icon) > **Service accounts**.
2. Click **Generate new private key**.
3. Save the JSON file securely (never commit to git). Note `project_id`, `client_email`, and `private_key`.

---

## 2. Vercel Deployment Setup

### Step 1: Connect Repository to Vercel
1. Push this repository to GitHub or GitLab.
2. In [Vercel Dashboard](https://vercel.com/), select **Add New Project** and import the repository.
3. Framework Preset: **Vite**.

### Step 2: Configure Environment Variables
Under **Project Settings** > **Environment Variables**, define:

#### Client Variables (Exposed to Browser)
- `VITE_FIREBASE_API_KEY`: Web API key from Firebase Project Settings.
- `VITE_FIREBASE_AUTH_DOMAIN`: `<project-id>.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: `<project-id>`
- `VITE_FIREBASE_APP_ID`: Web App ID from Firebase.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Sender ID from Firebase.
- `VITE_API_BASE_URL`: `/api`
- `VITE_APP_NAME`: `FaceAttend`
- `VITE_DEFAULT_TIMEZONE`: `Asia/Kolkata`
- `VITE_MODEL_URL`: `/models`
- `VITE_MAX_MEDIA_KB`: `500`

#### Server Variables (Secrets - Production & Preview Scopes)
- `FIREBASE_PROJECT_ID`: Project ID from service account.
- `FIREBASE_CLIENT_EMAIL`: Client email from service account.
- `FIREBASE_PRIVATE_KEY`: Private key string (including `-----BEGIN PRIVATE KEY-----`).
- `ADMIN_EMAILS`: Comma-separated admin emails (e.g., `admin@yourorg.com`).
- `IMGBB_API_KEY`: API key from [ImgBB](https://api.imgbb.com/).
- `CHAT_PROVIDER_API_KEY`: Google Gemini API Key from Google AI Studio.
- `CHAT_MODEL`: `gemini-1.5-flash`
- `MATCH_THRESHOLD_DEFAULT`: `0.45`
- `KIOSK_RATE_LIMIT_PER_MIN`: `30`
- `APP_TIMEZONE`: `Asia/Kolkata`
- `CORS_ALLOWED_ORIGINS`: `https://your-production-app.vercel.app`

---

## 3. Post-Deployment Verification Checklist

- [ ] Run `npm run check:env` to verify all variable names.
- [ ] Run `npm run admin:create` with server credentials to provision the initial administrator user and set custom claim `admin: true`.
- [ ] Log in at `/admin/login` using the administrator credentials.
- [ ] Verify that navigating to `/admin/enroll` prompts for camera permission.
- [ ] Test the public Kiosk page at `/kiosk`.
