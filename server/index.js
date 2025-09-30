const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

// Persistence helpers (KV or local JSON for dev)
const { loadMembers, saveMembers, loadSchedule, saveSchedule } = require('./persistence');

// Global variables (from env)
const PASSCODE = process.env.USER_PASSCODE || process.env.PASSCODE;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;
const ZOOM_LINK = process.env.GROUP_ZOOM_LINK;
const SCHEDULE_REPORT_EMAIL = process.env.SCHEDULE_REPORT_EMAIL;

// Sample group members (you can replace with actual members)
let groupMembers = [
  { name: "Dr. Alexandra Martinez", email: "a.martinez@biospec.edu" },
  { name: "Prof. Benjamin Wong", email: "b.wong@biospec.edu" },
  { name: "Dr. Cassandra Patel", email: "c.patel@biospec.edu" },
  { name: "Prof. Daniel O'Connor", email: "d.oconnor@biospec.edu" },
  { name: "Dr. Elena Rodriguez", email: "e.rodriguez@biospec.edu" },
  { name: "Prof. Franklin Zhang", email: "f.zhang@biospec.edu" },
  { name: "Dr. Gabriella Silva", email: "g.silva@biospec.edu" },
  { name: "Prof. Harrison Taylor", email: "h.taylor@biospec.edu" },
  { name: "Dr. Isabella Kim", email: "i.kim@biospec.edu" },
  { name: "Prof. Jackson Williams", email: "j.williams@biospec.edu" }
];

// Schedule storage
let presentationSchedule = [];
let currentRound = 1;

// Email transporter (configure with your SMTP service)
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
const smtpUser = process.env.EMAIL_USER;
const smtpPass = process.env.EMAIL_PASS;

if (!smtpUser || !smtpPass) {
  console.warn('[Email] EMAIL_USER/EMAIL_PASS not configured. Email sending will fail until configured.');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

// Helper functions
function generateSchedule(startDate = new Date('2025-09-08')) {
  const schedule = [];
  const shuffledMembers = [...groupMembers].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledMembers.length; i += 2) {
    const meetingDate = new Date(startDate);
    meetingDate.setDate(startDate.getDate() + (i / 2) * 14);
    
    schedule.push({
      date: meetingDate.toISOString().split('T')[0],
      time: '09:00',
      presenter1: shuffledMembers[i].name,
      presenter2: shuffledMembers[i + 1] ? shuffledMembers[i + 1].name : null,
      presenter1Email: shuffledMembers[i].email,
      presenter2Email: shuffledMembers[i + 1] ? shuffledMembers[i + 1].email : null
    });
  }
  
  return schedule;
}

function getMemberByName(name) {
  return groupMembers.find((m) => m.name === name) || null;
}

async function sendEmail(to, subject, text) {
  if (!smtpUser || !smtpPass) {
    throw new Error('EMAIL_USER/EMAIL_PASS not configured');
  }
  const mailOptions = {
    from: smtpUser,
    to: to,
    subject: subject,
    text: text
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', info.response);
  return info;
}

function composeFullScheduleEmailText() {
  const sorted = [...presentationSchedule].sort((a, b) => new Date(a.date) - new Date(b.date));
  const lines = [
    'Biospec Group: Full Schedule',
    '',
    `Generated at: ${new Date().toISOString()}`,
    ''
  ];
  for (const m of sorted) {
    const line = `${m.date} ${m.time || '09:00'}  -  ${m.presenter1}${m.presenter2 ? `, ${m.presenter2}` : ''}`;
    lines.push(line);
  }
  lines.push('', `Total meetings: ${sorted.length}`);
  return lines.join('\n');
}

// ---- Calendar invite (ICS) helpers ----
function pad2(n) { return String(n).padStart(2, '0'); }

function formatIcsLocal(dateStr, timeStr) {
  // Returns local time format without Z, to be used with TZID
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh)}${pad2(mm)}00`;
}

function addMinutesToTimeStr(timeStr, addMinutes) {
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  const total = hh * 60 + mm + addMinutes;
  const newH = Math.floor((total % (24 * 60) + (24 * 60)) % (24 * 60) / 60);
  const newM = ((total % 60) + 60) % 60;
  return `${pad2(newH)}:${pad2(newM)}`;
}

function buildICSForMeeting(meeting) {
  const startLocal = formatIcsLocal(meeting.date, meeting.time || '09:00');
  const endLocal = formatIcsLocal(meeting.date, addMinutesToTimeStr(meeting.time || '09:00', 120));
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.[0-9]{3}Z$/, 'Z').replace(/Z$/, 'Z');
  const uid = `biospec-${meeting.date}-${(meeting.time || '09:00').replace(':','')}-${Math.random().toString(36).slice(2)}@scheduler`;
  const summary = 'Biospec Group Meeting';
  const description = `Presenters: ${meeting.presenter1 || 'TBD'}${meeting.presenter2 ? ` and ${meeting.presenter2}` : ''}\nZoom: ${ZOOM_LINK || ''}`;

  // Minimal VTIMEZONE for Europe/Berlin
  const vtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Berlin',
    'X-LIC-LOCATION:Europe/Berlin',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Biospec Group//Meeting Scheduler//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    vtimezone,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Europe/Berlin:${startLocal}`,
    `DTEND;TZID=Europe/Berlin:${endLocal}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=Biospec Group:mailto:${smtpUser || 'noreply@example.com'}`,
    'LOCATION:Zoom',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\n');
}

function checkAndUpdateSchedule() {
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Clean up past meetings (keep only today or future)
  presentationSchedule = presentationSchedule.filter(m => {
    const d = new Date(m.date);
    const dYMD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dYMD >= todayYMD;
  });

  // Compute next Monday relative to today
  const nextMonday = new Date(todayYMD);
  const daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7; // 1 = Monday
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);

  const nextMondayISO = nextMonday.toISOString().split('T')[0];
  const meetingNextWeek = presentationSchedule.find(m => m.date === nextMondayISO);

  if (meetingNextWeek) {
    // Case (2): Meeting next week -> remind everyone
    const reminderText = `Biospec Group Meeting Reminder\n\nDate: ${meetingNextWeek.date}\nTime: ${meetingNextWeek.time}\nPresenters: ${meetingNextWeek.presenter1} and ${meetingNextWeek.presenter2}\nZoom Link: ${ZOOM_LINK}\n\nPlease join us for the group meeting!`;
    const ics = buildICSForMeeting(meetingNextWeek);
    Promise.allSettled(groupMembers.map(member => transporter.sendMail({
      from: smtpUser,
      to: member.email,
      subject: 'Biospec Group Meeting Reminder',
      text: reminderText,
      alternatives: [{ content: reminderText, contentType: 'text/plain' }],
      icalEvent: {
        method: 'REQUEST',
        content: ics
      }
    })))
      .then(results => {
        const failures = results.filter(r => r.status === 'rejected').length;
        if (failures > 0) console.warn(`[Email] ${failures} reminder(s) failed`);
      });
  } else {
    // Case (1): No meeting next week -> remind presenters for two weeks from now
    const mondayAfterNext = new Date(nextMonday);
    mondayAfterNext.setDate(mondayAfterNext.getDate() + 7);
    const mondayAfterNextISO = mondayAfterNext.toISOString().split('T')[0];

    const meetingInTwoWeeks = presentationSchedule.find(m => m.date === mondayAfterNextISO)
      || presentationSchedule.find(m => new Date(m.date) > todayYMD);

    if (meetingInTwoWeeks) {
      const reminderText = `Presenter Reminder\n\nYou are scheduled to present on ${meetingInTwoWeeks.date} at ${meetingInTwoWeeks.time}.\nPlease prepare your talk.\nZoom Link: ${ZOOM_LINK}`;
      const ics = buildICSForMeeting(meetingInTwoWeeks);
      const tasks = [];
      if (meetingInTwoWeeks.presenter1Email) tasks.push(transporter.sendMail({
        from: smtpUser,
        to: meetingInTwoWeeks.presenter1Email,
        subject: 'Presenter Reminder',
        text: reminderText,
        alternatives: [{ content: reminderText, contentType: 'text/plain' }],
        icalEvent: { method: 'REQUEST', content: ics }
      }));
      if (meetingInTwoWeeks.presenter2Email) tasks.push(transporter.sendMail({
        from: smtpUser,
        to: meetingInTwoWeeks.presenter2Email,
        subject: 'Presenter Reminder',
        text: reminderText,
        alternatives: [{ content: reminderText, contentType: 'text/plain' }],
        icalEvent: { method: 'REQUEST', content: ics }
      }));
      Promise.allSettled(tasks).then(results => {
        const failures = results.filter(r => r.status === 'rejected').length;
        if (failures > 0) console.warn(`[Email] ${failures} presenter reminder(s) failed`);
      });
    }
  }

  // Send weekly full schedule report to designated email
  try {
    const reportText = composeFullScheduleEmailText();
    sendEmail(SCHEDULE_REPORT_EMAIL, 'Biospec Full Schedule (Weekly Report)', reportText)
      .then(() => console.log(`[Email] Full schedule report sent to ${SCHEDULE_REPORT_EMAIL}`))
      .catch((e) => console.warn('[Email] Failed to send full schedule report', e));
  } catch (e) {
    console.warn('[Email] Exception preparing full schedule report', e);
  }

  // Optional: extend schedule if too few unscheduled members remain (keep prior behavior)
  const remainingPresenters = groupMembers.filter(member => {
    const hasPresented = presentationSchedule.some(meeting => 
      meeting.presenter1 === member.name || meeting.presenter2 === member.name
    );
    return !hasPresented;
  });
  if (remainingPresenters.length < groupMembers.length / 3 && presentationSchedule.length > 0) {
    currentRound++;
    const lastMeetingDate = new Date(presentationSchedule[presentationSchedule.length - 1].date);
    lastMeetingDate.setDate(lastMeetingDate.getDate() + 14);
    const newSchedule = generateSchedule(lastMeetingDate);
    presentationSchedule = [...presentationSchedule, ...newSchedule];
    console.log('New round generated:', currentRound);
  }
}

// Initialize members and schedule from persistence (or defaults)
let initializationComplete = false;
const initializeData = async () => {
  if (initializationComplete) {
    return;
  }
  try {
    const storedMembers = await loadMembers();
    if (storedMembers && Array.isArray(storedMembers) && storedMembers.length > 0) {
      groupMembers = storedMembers;
    } else {
      await saveMembers(groupMembers);
    }

    const storedSchedule = await loadSchedule();
    if (storedSchedule && Array.isArray(storedSchedule) && storedSchedule.length > 0) {
      presentationSchedule = storedSchedule;
    } else {
      presentationSchedule = generateSchedule();
      await saveSchedule(presentationSchedule);
    }
    console.log(`[Init] Loaded members: ${groupMembers.length}, meetings: ${presentationSchedule.length}`);
    initializationComplete = true;
  } catch (e) {
    console.warn('[Init] Failed to load persisted state, using defaults', e);
    if (!presentationSchedule || presentationSchedule.length === 0) {
      presentationSchedule = generateSchedule();
    }
  }
};

const initializationPromise = initializeData();

// Middleware to ensure data is loaded before handling requests
const ensureDataLoaded = async (req, res, next) => {
  try {
    await initializationPromise;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server initialization failed' });
  }
};

// Cron job to run every Friday at 9 AM
// Note: In production, you might want to use a more reliable scheduling service
cron.schedule('0 8 * * 5', async () => {
  await initializationPromise; // Ensure data is loaded before running cron job
  checkAndUpdateSchedule();
}, {
  timezone: "Europe/Berlin"
});

// API Routes
app.post('/api/login', (req, res) => {
  const { passcode } = req.body;
  
  if (passcode === ADMIN_PASSCODE) {
    res.json({ 
      success: true, 
      message: 'Admin login successful',
      userType: 'admin'
    });
  } else if (passcode === PASSCODE) {
    res.json({ 
      success: true, 
      message: 'Login successful',
      userType: 'user'
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid passcode' });
  }
});

app.get('/api/schedule', ensureDataLoaded, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = presentationSchedule.filter(m => {
    const d = new Date(m.date);
    const dYMD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dYMD >= todayYMD;
  });
  res.json(upcoming);
});

app.post('/api/swap-presenters', ensureDataLoaded, (req, res) => {
  const { date1, presenter1, date2, presenter2 } = req.body;

  if (!date1 || !date2 || !presenter1 || !presenter2) {
    return res.status(400).json({ success: false, message: 'date1, presenter1, date2, presenter2 are required' });
  }

  const meeting1 = presentationSchedule.find(m => m.date === date1);
  const meeting2 = presentationSchedule.find(m => m.date === date2);

  if (!meeting1 || !meeting2) {
    return res.status(400).json({ success: false, message: 'Invalid dates' });
  }

  // Determine which slots the selected presenters occupy
  const slot1 = meeting1.presenter1 === presenter1 ? 'presenter1'
               : meeting1.presenter2 === presenter1 ? 'presenter2'
               : null;
  const slot2 = meeting2.presenter1 === presenter2 ? 'presenter1'
               : meeting2.presenter2 === presenter2 ? 'presenter2'
               : null;

  if (!slot1) {
    return res.status(400).json({ success: false, message: `Presenter ${presenter1} not found on ${date1}` });
  }
  if (!slot2) {
    return res.status(400).json({ success: false, message: `Presenter ${presenter2} not found on ${date2}` });
  }

  // Swap only the selected slots (names and emails)
  const tmpName = meeting1[slot1];
  const tmpEmail = meeting1[`${slot1}Email`];

  meeting1[slot1] = meeting2[slot2];
  meeting1[`${slot1}Email`] = meeting2[`${slot2}Email`];

  meeting2[slot2] = tmpName;
  meeting2[`${slot2}Email`] = tmpEmail;

  saveSchedule(presentationSchedule).finally(() => {
    res.json({ success: true, schedule: presentationSchedule });
  });
});

app.post('/api/skip-meeting', ensureDataLoaded, (req, res) => {
  const { date } = req.body;

  const skipIndex = presentationSchedule.findIndex((meeting) => meeting.date === date);

  if (skipIndex === -1) {
    return res.status(400).json({ success: false, message: 'Meeting date not found' });
  }

  const skippedMeeting = presentationSchedule[skipIndex];
  const skippedPresenters = {
    presenter1: skippedMeeting.presenter1,
    presenter2: skippedMeeting.presenter2,
    presenter1Email: skippedMeeting.presenter1Email,
    presenter2Email: skippedMeeting.presenter2Email
  };
  const skippedTime = skippedMeeting.time || '09:00';

  if (presentationSchedule.length === 1) {
    const baseDate = new Date(skippedMeeting.date);
    baseDate.setDate(baseDate.getDate() + 14);
    presentationSchedule[0] = {
      ...presentationSchedule[0],
      date: baseDate.toISOString().split('T')[0],
      time: skippedTime,
      presenter1: skippedPresenters.presenter1,
      presenter2: skippedPresenters.presenter2,
      presenter1Email: skippedPresenters.presenter1Email,
      presenter2Email: skippedPresenters.presenter2Email
    };
  } else {
    for (let i = skipIndex; i < presentationSchedule.length - 1; i++) {
      const nextMeeting = presentationSchedule[i + 1];
      presentationSchedule[i] = {
        ...presentationSchedule[i],
        date: nextMeeting.date,
        time: nextMeeting.time,
        presenter1: nextMeeting.presenter1,
        presenter2: nextMeeting.presenter2,
        presenter1Email: nextMeeting.presenter1Email,
        presenter2Email: nextMeeting.presenter2Email
      };
    }

    const lastIndex = presentationSchedule.length - 1;
    const baseDateStr = presentationSchedule[lastIndex - 1]
      ? presentationSchedule[lastIndex - 1].date
      : skippedMeeting.date;
    const baseDate = new Date(baseDateStr);
    baseDate.setDate(baseDate.getDate() + 14);

    presentationSchedule[lastIndex] = {
      ...presentationSchedule[lastIndex],
      date: baseDate.toISOString().split('T')[0],
      time: skippedTime,
      presenter1: skippedPresenters.presenter1,
      presenter2: skippedPresenters.presenter2,
      presenter1Email: skippedPresenters.presenter1Email,
      presenter2Email: skippedPresenters.presenter2Email
    };
  }

  console.log(`Meeting skipped: ${date}. Date removed and presenters shifted. Schedule has ${presentationSchedule.length} meetings.`);
  saveSchedule(presentationSchedule).finally(() => {
    res.json({ success: true, schedule: presentationSchedule });
  });
});

app.post('/api/change-date', ensureDataLoaded, (req, res) => {
  const { oldDate, newDate } = req.body;
  
  const meetingIndex = presentationSchedule.findIndex(meeting => meeting.date === oldDate);
  if (meetingIndex === -1) {
    return res.status(400).json({ success: false, message: 'Meeting date not found' });
  }
  
  // Update the meeting date
  presentationSchedule[meetingIndex].date = newDate;
  
  // Adjust subsequent dates to maintain 2-week intervals
  for (let i = meetingIndex + 1; i < presentationSchedule.length; i++) {
    const previousDate = new Date(presentationSchedule[i - 1].date);
    previousDate.setDate(previousDate.getDate() + 14);
    presentationSchedule[i].date = previousDate.toISOString().split('T')[0];
  }
  
  console.log(`Meeting date changed: ${oldDate} -> ${newDate}. Schedule updated.`);
  saveSchedule(presentationSchedule).finally(() => {
    res.json({ success: true, schedule: presentationSchedule });
  });
});

app.post('/api/change-time', ensureDataLoaded, (req, res) => {
  const { date, newTime, adminPasscode } = req.body;
  
  // Verify admin access
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  const meetingIndex = presentationSchedule.findIndex(meeting => meeting.date === date);
  if (meetingIndex === -1) {
    return res.status(400).json({ success: false, message: 'Meeting date not found' });
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(newTime)) {
    return res.status(400).json({ success: false, message: 'Invalid time format. Use HH:MM (e.g., 09:00, 14:30)' });
  }
  
  // Update the meeting time
  presentationSchedule[meetingIndex].time = newTime;
  
  console.log(`Meeting time changed: ${date} -> ${newTime}.`);
  saveSchedule(presentationSchedule).finally(() => {
    res.json({ success: true, schedule: presentationSchedule });
  });
});

app.get('/api/members', ensureDataLoaded, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json(groupMembers);
});

// Admin endpoints for managing members and regenerating schedule
app.post('/api/admin/add-member', ensureDataLoaded, (req, res) => {
  const { member, adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  if (!member || !member.name || !member.email) {
    return res.status(400).json({ success: false, message: 'Member must include name and email' });
  }
  const alreadyExists = groupMembers.some((m) => m.name === member.name || m.email === member.email);
  if (alreadyExists) {
    return res.status(400).json({ success: false, message: 'Member with same name or email already exists' });
  }
  groupMembers.push({ name: member.name, email: member.email });
  saveMembers(groupMembers).finally(() => {
    return res.json({ success: true, members: groupMembers });
  });
});

app.post('/api/admin/remove-member', ensureDataLoaded, (req, res) => {
  const { name, adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  const index = groupMembers.findIndex((m) => m.name === name);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }
  // Remove from members
  const removed = groupMembers.splice(index, 1)[0];
  // Remove their scheduled appearances (future only)
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  presentationSchedule = presentationSchedule.map((meeting) => {
    const updated = { ...meeting };
    const md = new Date(updated.date);
    const mdYMD = new Date(md.getFullYear(), md.getMonth(), md.getDate());
    if (mdYMD >= todayYMD && updated.presenter1 === removed.name) {
      updated.presenter1 = null;
      updated.presenter1Email = null;
    }
    if (mdYMD >= todayYMD && updated.presenter2 === removed.name) {
      updated.presenter2 = null;
      updated.presenter2Email = null;
    }
    return updated;
  });
  Promise.allSettled([saveMembers(groupMembers), saveSchedule(presentationSchedule)]).finally(() => {
    return res.json({ success: true, members: groupMembers, schedule: presentationSchedule });
  });
});

// Remove a single presenter from a specific meeting (admin only)
app.post('/api/admin/remove-presenter', ensureDataLoaded, (req, res) => {
  const { date, slot, adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  if (!date || (slot !== 'presenter1' && slot !== 'presenter2')) {
    return res.status(400).json({ success: false, message: 'date and slot (presenter1|presenter2) are required' });
  }

  const idx = presentationSchedule.findIndex(m => m.date === date);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Meeting date not found' });
  }

  // Optional: restrict to today/future
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const md = new Date(presentationSchedule[idx].date);
  const mdYMD = new Date(md.getFullYear(), md.getMonth(), md.getDate());
  if (mdYMD < todayYMD) {
    return res.status(400).json({ success: false, message: 'Cannot modify a past meeting' });
  }

  presentationSchedule[idx][slot] = null;
  presentationSchedule[idx][`${slot}Email`] = null;

  saveSchedule(presentationSchedule).finally(() => {
    return res.json({ success: true, schedule: presentationSchedule });
  });
});

// Assign a specific member to a presenter slot on a specific date (admin only)
app.post('/api/admin/assign-presenter', ensureDataLoaded, (req, res) => {
  const { date, slot, memberName, adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  if (!date || (slot !== 'presenter1' && slot !== 'presenter2') || !memberName) {
    return res.status(400).json({ success: false, message: 'date, slot (presenter1|presenter2), and memberName are required' });
  }

  const idx = presentationSchedule.findIndex(m => m.date === date);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Meeting date not found' });
  }

  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const md = new Date(presentationSchedule[idx].date);
  const mdYMD = new Date(md.getFullYear(), md.getMonth(), md.getDate());
  if (mdYMD < todayYMD) {
    return res.status(400).json({ success: false, message: 'Cannot modify a past meeting' });
  }

  const member = groupMembers.find(m => m.name === memberName);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  presentationSchedule[idx][slot] = member.name;
  presentationSchedule[idx][`${slot}Email`] = member.email;

  saveSchedule(presentationSchedule).finally(() => {
    return res.json({ success: true, schedule: presentationSchedule });
  });
});

app.post('/api/admin/refill-schedule', ensureDataLoaded, (req, res) => {
  const { adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  // Collect names already scheduled (exclude TBD)
  const scheduledNames = new Set();
  for (const mt of presentationSchedule) {
    if (mt.presenter1) scheduledNames.add(mt.presenter1);
    if (mt.presenter2) scheduledNames.add(mt.presenter2);
  }

  // Compute unscheduled members
  const unscheduled = groupMembers.filter((m) => !scheduledNames.has(m.name));

  // Fill empty second slots (null) in chronological order (future meetings only)
  let fillIndex = 0;
  for (const mt of presentationSchedule) {
    const md = new Date(mt.date);
    const today = new Date();
    const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const mdYMD = new Date(md.getFullYear(), md.getMonth(), md.getDate());
    if (mdYMD < todayYMD) continue;
    if (fillIndex >= unscheduled.length) break;
    if (!mt.presenter1) {
      const mem = unscheduled[fillIndex++];
      mt.presenter1 = mem.name;
      mt.presenter1Email = mem.email;
      if (fillIndex >= unscheduled.length) break;
    }
    if (!mt.presenter2) {
      if (fillIndex < unscheduled.length) {
        const mem = unscheduled[fillIndex++];
        mt.presenter2 = mem.name;
        mt.presenter2Email = mem.email;
      }
    }
  }

  // Append new meetings for any remaining unscheduled members
  if (fillIndex < unscheduled.length) {
    // Determine next meeting date
    let baseDate;
    if (presentationSchedule.length > 0) {
      baseDate = new Date(presentationSchedule[presentationSchedule.length - 1].date);
    } else {
      baseDate = new Date('2025-09-08');
    }
    // Create new meetings in pairs
    while (fillIndex < unscheduled.length) {
      // Next meeting date is +14 days from last
      baseDate = new Date(baseDate);
      baseDate.setDate(baseDate.getDate() + 14);
      const presenterA = unscheduled[fillIndex++];
      const presenterB = fillIndex < unscheduled.length ? unscheduled[fillIndex++] : null;
      presentationSchedule.push({
        date: baseDate.toISOString().split('T')[0],
        time: '09:00',
        presenter1: presenterA.name,
        presenter1Email: presenterA.email,
        presenter2: presenterB ? presenterB.name : 'TBD',
        presenter2Email: presenterB ? presenterB.email : null,
      });
    }
  }

  saveSchedule(presentationSchedule).finally(() => {
    return res.json({ success: true, schedule: presentationSchedule });
  });
});
app.post('/api/admin/update-members', ensureDataLoaded, (req, res) => {
  const { members, adminPasscode } = req.body;
  
  // Verify admin access
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid members data' });
  }
  
  // Validate member data
  for (const member of members) {
    if (!member.name || !member.email) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid member data: ${JSON.stringify(member)}` 
      });
    }
  }
  
  // Update members
  groupMembers = [...members];
  
  // Regenerate schedule with new members using same start as existing schedule if present
  const start = presentationSchedule.length > 0 ? new Date(presentationSchedule[0].date) : new Date('2025-09-08');
  presentationSchedule = generateSchedule(start);
  currentRound = 1;
  
  console.log(`Members updated: ${groupMembers.length} members. New schedule generated with ${presentationSchedule.length} meetings.`);
  
  Promise.allSettled([saveMembers(groupMembers), saveSchedule(presentationSchedule)]).finally(() => {
    res.json({ 
      success: true, 
      message: 'Members updated and schedule regenerated',
      members: groupMembers,
      schedule: presentationSchedule
    });
  });
});

app.post('/api/admin/regenerate-schedule', ensureDataLoaded, async (req, res) => {
  const { startDate, adminPasscode } = req.body;
  
  // Verify admin access
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  try {
    const start = startDate ? new Date(startDate) : new Date('2025-09-08');
    presentationSchedule = generateSchedule(start);
    currentRound = 1;
    
    console.log(`Schedule regenerated starting from ${start.toISOString().split('T')[0]}. ${presentationSchedule.length} meetings created.`);
    
    saveSchedule(presentationSchedule).finally(() => {
      res.json({ 
        success: true, 
        message: 'Schedule regenerated successfully',
        schedule: presentationSchedule
      });
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Invalid start date format. Use YYYY-MM-DD' 
    });
  }
});

app.get('/api/admin/export-members', ensureDataLoaded, (req, res) => {
  const { adminPasscode } = req.query;
  
  // Verify admin access
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  res.json({
    success: true,
    members: groupMembers,
    exportDate: new Date().toISOString()
  });
});

// Export full schedule including past meetings
app.get('/api/admin/schedule-full', ensureDataLoaded, (req, res) => {
  const { adminPasscode } = req.query;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  res.json({ success: true, schedule: presentationSchedule, exportDate: new Date().toISOString() });
});

// Simple healthcheck for cron/execution visibility
app.get('/api/health', ensureDataLoaded, (req, res) => {
  res.json({ ok: true, now: new Date().toISOString(), nextMeeting: presentationSchedule[0] || null });
});

// Cron trigger endpoint (for Vercel Cron or manual invocation)
function isReminderAuthorized(req) {
  // Check if request is from Vercel Cron
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  if (isVercelCron) {
    // Optionally verify CRON_SECRET if configured
    if (process.env.CRON_SECRET) {
      const authHeader = req.headers['authorization'];
      if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        return true;
      }
      // For backwards compatibility, also check other locations
      const token = req.body?.cronSecret || req.query?.cronSecret;
      if (token === process.env.CRON_SECRET) {
        return true;
      }
    } else {
      // If CRON_SECRET is not set, trust the x-vercel-cron header
      return true;
    }
  }
  
  // Check for manual invocation with admin passcode
  const token = req.body?.adminPasscode || req.query?.adminPasscode;
  if (token && ADMIN_PASSCODE && token === ADMIN_PASSCODE) {
    return true;
  }
  
  return false;
}

const runReminderHandler = (req, res) => {
  if (!isReminderAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  try {
    checkAndUpdateSchedule();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to run reminder check' });
  }
};

app.post('/api/admin/run-reminder-check', ensureDataLoaded, runReminderHandler);
app.get('/api/admin/run-reminder-check', ensureDataLoaded, runReminderHandler);

// Manual reminders
app.post('/api/admin/send-presenter-reminder', ensureDataLoaded, (req, res) => {
  const { adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = presentationSchedule.find(m => new Date(m.date) >= todayYMD);
  if (!upcoming) {
    return res.status(404).json({ success: false, message: 'No upcoming meeting found' });
  }
  const text = `Presenter Reminder\n\nYou are scheduled to present on ${upcoming.date} at ${upcoming.time}.\nPlease prepare your talk.\nZoom Link: ${ZOOM_LINK}`;
  const ics = buildICSForMeeting(upcoming);
  const tasks = [];
  if (upcoming.presenter1Email) tasks.push(transporter.sendMail({
    from: smtpUser,
    to: upcoming.presenter1Email,
    subject: 'Presenter Reminder',
    text,
    alternatives: [{ content: text, contentType: 'text/plain' }],
    icalEvent: { method: 'REQUEST', content: ics }
  }));
  if (upcoming.presenter2Email) tasks.push(transporter.sendMail({
    from: smtpUser,
    to: upcoming.presenter2Email,
    subject: 'Presenter Reminder',
    text,
    alternatives: [{ content: text, contentType: 'text/plain' }],
    icalEvent: { method: 'REQUEST', content: ics }
  }));
  Promise.allSettled(tasks).then(results => {
    const failures = results.filter(r => r.status === 'rejected');
    return res.json({ success: failures.length === 0, failures: failures.length });
  }).catch(() => res.json({ success: false }));
});

app.post('/api/admin/send-everyone-reminder', ensureDataLoaded, (req, res) => {
  const { adminPasscode } = req.body;
  if (adminPasscode !== ADMIN_PASSCODE) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const today = new Date();
  const todayYMD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = presentationSchedule.find(m => new Date(m.date) >= todayYMD);
  if (!upcoming) {
    return res.status(404).json({ success: false, message: 'No upcoming meeting found' });
  }
  const text = `Biospec Group Meeting Reminder\n\nDate: ${upcoming.date}\nTime: ${upcoming.time}\nPresenters: ${upcoming.presenter1} and ${upcoming.presenter2}\nZoom Link: ${ZOOM_LINK}\n\nPlease join us for the group meeting!`;
  const ics = buildICSForMeeting(upcoming);
  Promise.allSettled(groupMembers.map(member => transporter.sendMail({
    from: smtpUser,
    to: member.email,
    subject: 'Biospec Group Meeting Reminder',
    text,
    alternatives: [{ content: text, contentType: 'text/plain' }],
    icalEvent: { method: 'REQUEST', content: ics }
  })))
    .then(results => {
      const failures = results.filter(r => r.status === 'rejected');
      return res.json({ success: failures.length === 0, failures: failures.length });
    })
    .catch(() => res.json({ success: false }));
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializationPromise.then(() => {
    console.log('Initial schedule generated:', presentationSchedule.length, 'meetings');
  });
});
