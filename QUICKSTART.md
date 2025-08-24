# 🚀 Quick Start Guide

Get your Biospec Group Meeting Scheduler up and running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- Gmail account (for email functionality)

## Step 1: Install Dependencies

```bash
npm run install-all
```

## Step 2: Configure Email (Optional but Recommended)

1. Copy the environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your Gmail credentials:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Important**: Generate a Gmail App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Enable 2-Factor Authentication if not already enabled
   - Generate an app password for "Mail"
   - Use this password in your `.env` file

## Step 3: Start the Application

```bash
npm run dev
```

This starts both the backend server (port 3001) and React frontend (port 3000).

## Step 4: Access the App

1. Open your browser to `http://localhost:3000`
2. Enter the passcode: `BiospecParty`
3. View and manage your presentation schedule!

## Alternative Commands

- **Backend only**: `npm run server`
- **Production**: `npm start` (after building)
- **Build only**: `npm run build`

## Default Configuration

- **Passcode**: `BiospecParty`
- **Start Date**: September 8th, 2025 (Monday)
- **Frequency**: Every 2 weeks on Monday
- **Presenters**: 2 per meeting
- **Group Size**: 10 members (configurable)

## Customization

Edit `server/index.js` to:
- Change the passcode
- Modify group members
- Adjust meeting rules
- Update email templates

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Review server logs for debugging
- Ensure all dependencies are properly installed

---

**🎉 You're all set! Your meeting scheduler is ready to use.**
