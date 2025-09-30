const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function isKVConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
         !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getKVBase() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function kvGet(key, retries = 2) {
  const { url, token } = getKVBase();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!resp.ok) {
        if (attempt < retries) {
          console.log(`[KV] Fetch failed for ${key}, attempt ${attempt + 1}/${retries + 1}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          continue;
        }
        return null;
      }
      const data = await resp.json();
      return data.result ? JSON.parse(data.result) : null;
    } catch (error) {
      if (attempt < retries) {
        console.log(`[KV] Error fetching ${key} (${error.message}), attempt ${attempt + 1}/${retries + 1}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      console.error(`[KV] Failed to fetch ${key} after ${retries + 1} attempts:`, error.message);
      throw error;
    }
  }
  return null;
}

async function kvSet(key, value, retries = 2) {
  const { url, token } = getKVBase();
  const val = encodeURIComponent(JSON.stringify(value));
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Upstash Redis REST uses command-style paths, e.g. /set/{key}/{value}
      const resp = await fetch(`${url}/set/${encodeURIComponent(key)}/${val}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (resp.ok) return true;
      
      if (attempt < retries) {
        console.log(`[KV] Set failed for ${key}, attempt ${attempt + 1}/${retries + 1}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      return false;
    } catch (error) {
      if (attempt < retries) {
        console.log(`[KV] Error setting ${key} (${error.message}), attempt ${attempt + 1}/${retries + 1}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      console.error(`[KV] Failed to set ${key} after ${retries + 1} attempts:`, error.message);
      throw error;
    }
  }
  return false;
}

async function loadMembers() {
  if (isKVConfigured()) {
    return await kvGet('members');
  }
  ensureDataDir();
  if (fs.existsSync(MEMBERS_FILE)) {
    return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf-8'));
  }
  return null;
}

async function saveMembers(members) {
  if (isKVConfigured()) {
    await kvSet('members', members);
    return;
  }
  ensureDataDir();
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2));
}

async function loadSchedule() {
  if (isKVConfigured()) {
    return await kvGet('schedule');
  }
  ensureDataDir();
  if (fs.existsSync(SCHEDULE_FILE)) {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8'));
  }
  return null;
}

async function saveSchedule(schedule) {
  if (isKVConfigured()) {
    await kvSet('schedule', schedule);
    return;
  }
  ensureDataDir();
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2));
}

module.exports = {
  loadMembers,
  saveMembers,
  loadSchedule,
  saveSchedule,
  isKVConfigured
};


