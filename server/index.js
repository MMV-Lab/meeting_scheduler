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

// Global variables
const PASSCODE = "BiospecParty";
const ADMIN_PASSCODE = "AdminChen01234";
const ZOOM_LINK = "https://zoom.us/j/1234567890?pwd=placeholder";

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

// Email transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
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
      presenter1: shuffledMembers[i].name,
      presenter2: shuffledMembers[i + 1] ? shuffledMembers[i + 1].name : 'TBD',
      presenter1Email: shuffledMembers[i].email,
      presenter2Email: shuffledMembers[i + 1] ? shuffledMembers[i + 1].email : null
    });
  }
  
  return schedule;
}

function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: to,
    subject: subject,
    text: text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

function checkAndUpdateSchedule() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  
  if (dayOfWeek === 5) { // Friday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + 3);
    
    const nextMeeting = presentationSchedule.find(meeting => 
      meeting.date === nextMonday.toISOString().split('T')[0]
    );
    
    if (nextMeeting) {
      // Send reminder to everyone
      const reminderText = `Biospec Group Meeting Reminder\n\nDate: ${nextMeeting.date}\nPresenters: ${nextMeeting.presenter1} and ${nextMeeting.presenter2}\nZoom Link: ${ZOOM_LINK}\n\nPlease join us for the group meeting!`;
      
      groupMembers.forEach(member => {
        sendEmail(member.email, 'Biospec Group Meeting Reminder', reminderText);
      });
      
      // Check if we need to generate new schedule
      const remainingPresenters = groupMembers.filter(member => {
        const hasPresented = presentationSchedule.some(meeting => 
          meeting.presenter1 === member.name || meeting.presenter2 === member.name
        );
        return !hasPresented;
      });
      
      if (remainingPresenters.length < groupMembers.length / 3) {
        // Generate new round
        currentRound++;
        const lastMeetingDate = new Date(presentationSchedule[presentationSchedule.length - 1].date);
        lastMeetingDate.setDate(lastMeetingDate.getDate() + 14);
        
        const newSchedule = generateSchedule(lastMeetingDate);
        presentationSchedule = [...presentationSchedule, ...newSchedule];
        
        console.log('New round generated:', currentRound);
      }
    } else {
      // Remove past meeting and move schedule up
      const pastMeeting = presentationSchedule.find(meeting => {
        const meetingDate = new Date(meeting.date);
        return meetingDate < today;
      });
      
      if (pastMeeting) {
        presentationSchedule = presentationSchedule.filter(meeting => meeting.date !== pastMeeting.date);
        
        // Send reminder to next presenters
        if (presentationSchedule.length > 0) {
          const nextMeeting = presentationSchedule[0];
          const reminderText = `Presentation Reminder\n\nYou are scheduled to present on ${nextMeeting.date}. Please prepare your presentation.`;
          
          if (nextMeeting.presenter1Email) {
            sendEmail(nextMeeting.presenter1Email, 'Presentation Reminder', reminderText);
          }
          if (nextMeeting.presenter2Email) {
            sendEmail(nextMeeting.presenter2Email, 'Presentation Reminder', reminderText);
          }
        }
      }
    }
  }
}

// Initialize schedule
presentationSchedule = generateSchedule();

// Cron job to run every Friday at 9 AM
// Note: In production, you might want to use a more reliable scheduling service
cron.schedule('0 9 * * 5', checkAndUpdateSchedule, {
  timezone: "America/New_York" // Adjust timezone as needed
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

app.get('/api/schedule', (req, res) => {
  res.json(presentationSchedule);
});

app.post('/api/swap-presenters', (req, res) => {
  const { date1, presenter1, date2, presenter2 } = req.body;
  
  const meeting1 = presentationSchedule.find(m => m.date === date1);
  const meeting2 = presentationSchedule.find(m => m.date === date2);
  
  if (meeting1 && meeting2) {
    // Swap presenters
    const tempPresenter1 = meeting1.presenter1;
    const tempPresenter2 = meeting1.presenter2;
    
    meeting1.presenter1 = presenter1;
    meeting1.presenter2 = presenter2;
    meeting2.presenter1 = tempPresenter1;
    meeting2.presenter2 = tempPresenter2;
    
    res.json({ success: true, schedule: presentationSchedule });
  } else {
    res.status(400).json({ success: false, message: 'Invalid dates' });
  }
});

app.post('/api/skip-meeting', (req, res) => {
  const { date } = req.body;
  
  // Find the index of the meeting to skip
  const skipIndex = presentationSchedule.findIndex(meeting => meeting.date === date);
  
  if (skipIndex === -1) {
    return res.status(400).json({ success: false, message: 'Meeting date not found' });
  }
  
  // Store the presenters from the skipped meeting
  const skippedPresenters = {
    presenter1: presentationSchedule[skipIndex].presenter1,
    presenter2: presentationSchedule[skipIndex].presenter2,
    presenter1Email: presentationSchedule[skipIndex].presenter1Email,
    presenter2Email: presentationSchedule[skipIndex].presenter2Email
  };
  
  // Shift all presenters forward by one slot, starting from the skipped meeting
  for (let i = skipIndex; i < presentationSchedule.length - 1; i++) {
    presentationSchedule[i].presenter1 = presentationSchedule[i + 1].presenter1;
    presentationSchedule[i].presenter2 = presentationSchedule[i + 1].presenter2;
    presentationSchedule[i].presenter1Email = presentationSchedule[i + 1].presenter1Email;
    presentationSchedule[i].presenter2Email = presentationSchedule[i + 1].presenter2Email;
  }
  
  // Put the skipped meeting's presenters in the last slot
  const lastIndex = presentationSchedule.length - 1;
  presentationSchedule[lastIndex].presenter1 = skippedPresenters.presenter1;
  presentationSchedule[lastIndex].presenter2 = skippedPresenters.presenter2;
  presentationSchedule[lastIndex].presenter1Email = skippedPresenters.presenter1Email;
  presentationSchedule[lastIndex].presenter2Email = skippedPresenters.presenter2Email;
  
  console.log(`Meeting skipped: ${date}. Presenters shifted forward. Schedule still has ${presentationSchedule.length} meetings.`);
  res.json({ success: true, schedule: presentationSchedule });
});

app.post('/api/change-date', (req, res) => {
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
  res.json({ success: true, schedule: presentationSchedule });
});

app.get('/api/members', (req, res) => {
  res.json(groupMembers);
});

// Admin endpoints for managing members and regenerating schedule
app.post('/api/admin/update-members', (req, res) => {
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
  
  // Regenerate schedule with new members
  presentationSchedule = generateSchedule();
  currentRound = 1;
  
  console.log(`Members updated: ${groupMembers.length} members. New schedule generated with ${presentationSchedule.length} meetings.`);
  
  res.json({ 
    success: true, 
    message: 'Members updated and schedule regenerated',
    members: groupMembers,
    schedule: presentationSchedule
  });
});

app.post('/api/admin/regenerate-schedule', (req, res) => {
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
    
    res.json({ 
      success: true, 
      message: 'Schedule regenerated successfully',
      schedule: presentationSchedule
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Invalid start date format. Use YYYY-MM-DD' 
    });
  }
});

app.get('/api/admin/export-members', (req, res) => {
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

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Initial schedule generated:', presentationSchedule.length, 'meetings');
});
