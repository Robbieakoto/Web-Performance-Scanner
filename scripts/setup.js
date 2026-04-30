#!/usr/bin/env node
/**
 * setup.js — One-time setup helper
 * Reads FIREBASE_PROJECT_ID from .env and writes it to .firebaserc
 */
const fs   = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const rcPath  = path.join(__dirname, '..', '.firebaserc');

if (!fs.existsSync(envPath)) {
  console.error('\n❌  .env file not found.');
  console.error('   Copy .env.example → .env and fill in your values.\n');
  process.exit(1);
}

require('dotenv').config({ path: envPath });

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId || projectId === 'your_firebase_project_id_here') {
  console.error('\n❌  FIREBASE_PROJECT_ID is not set in your .env file.\n');
  process.exit(1);
}

const rc = { projects: { default: projectId } };
fs.writeFileSync(rcPath, JSON.stringify(rc, null, 2));
console.log(`\n✅  .firebaserc updated → project: "${projectId}"\n`);
