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

async function kvGet(key) {
  const { url, token } = getKVBase();
  const resp = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const { url, token } = getKVBase();
  const resp = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value: JSON.stringify(value) })
  });
  return resp.ok;
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


