/**
 * Environment variable verification script.
 * Verifies .env.client (or .env.local) and .env.server have all required keys.
 * Flags security risks if client variables contain sensitive keywords.
 */

import fs from 'fs';

const REQUIRED_CLIENT_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_API_BASE_URL',
  'VITE_APP_NAME',
  'VITE_DEFAULT_TIMEZONE',
  'VITE_MODEL_URL',
  'VITE_MAX_MEDIA_KB'
];

const REQUIRED_SERVER_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'ADMIN_EMAILS',
  'IMGBB_API_KEY',
  'MATCH_THRESHOLD_DEFAULT',
  'KIOSK_RATE_LIMIT_PER_MIN',
  'APP_TIMEZONE',
  'CORS_ALLOWED_ORIGINS'
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

console.log('=== Checking Environment Configuration ===');

const clientEnvPath = fs.existsSync('.env.local') ? '.env.local' : '.env.client';
const clientEnv = parseEnvFile(clientEnvPath) || parseEnvFile('.env.client.example');
const serverEnvPath = fs.existsSync('.env.server') ? '.env.server' : '.env.server.example';
const serverEnv = parseEnvFile(serverEnvPath);

let hasErrors = false;

if (!clientEnv) {
  console.error('❌ Missing client environment file (.env.local or .env.client.example)');
  hasErrors = true;
} else {
  console.log(`✓ Checking client env using: ${clientEnvPath}`);
  for (const key of REQUIRED_CLIENT_KEYS) {
    if (!(key in clientEnv)) {
      console.error(`❌ Client env missing required key: ${key}`);
      hasErrors = true;
    }
  }

  // Check for leaks in client keys
  for (const key of Object.keys(clientEnv)) {
    const upper = key.toUpperCase();
    if (upper === 'VITE_FIREBASE_API_KEY') continue; // Allowed public Firebase web API key
    if (upper.includes('SECRET') || upper.includes('PRIVATE') || upper.includes('KEY')) {
      console.warn(`⚠️ Warning: Client variable "${key}" contains sensitive keyword (SECRET/PRIVATE/KEY)!`);
    }
  }
}

if (!serverEnv) {
  console.error('❌ Missing server environment file (.env.server or .env.server.example)');
  hasErrors = true;
} else {
  console.log(`✓ Checking server env using: ${serverEnvPath}`);
  for (const key of REQUIRED_SERVER_KEYS) {
    if (!(key in serverEnv)) {
      console.error(`❌ Server env missing required key: ${key}`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\nEnvironment validation failed with errors.');
  process.exit(1);
} else {
  console.log('\n✅ Environment validation passed.');
}
