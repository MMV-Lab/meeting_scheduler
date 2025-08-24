# 🚀 Deployment & Management Guide

## 📋 **Table of Contents**
1. [Deployment Options](#deployment-options)
2. [Member Management](#member-management)
3. [Schedule Regeneration](#schedule-regeneration)
4. [Admin Panel Usage](#admin-panel-usage)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 **Deployment Options**

### **Option A: GitHub + Vercel (Recommended)**

#### **Step 1: Prepare Repository**
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Biospec Group Meeting Scheduler"

# Create private repository on GitHub
# Then connect your local repo:
git remote add origin https://github.com/YOUR_USERNAME/meeting-scheduler.git
git branch -M main
git push -u origin main
```

#### **Step 2: Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project: No
# - Project name: meeting-scheduler
# - Directory: ./
# - Override settings: No
```

#### **Step 3: Configure Environment Variables**
In Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```

### **Option B: Heroku**

#### **Step 1: Install Heroku CLI**
```bash
# macOS
brew install heroku/brew/heroku

# Windows/Linux
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

#### **Step 2: Deploy**
```bash
# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-gmail-app-password

# Deploy
git push heroku main
```

### **Option C: Traditional VPS/Server**

#### **Step 1: Server Setup**
```bash
# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/YOUR_USERNAME/meeting-scheduler.git
cd meeting-scheduler

# Install dependencies
npm run install-all

# Build frontend
cd client && npm run build && cd ..
```

#### **Step 2: Environment Configuration**
```bash
# Copy environment file
cp env.example .env

# Edit with your credentials
nano .env
```

#### **Step 3: Run with PM2 (Production)**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server/index.js --name "meeting-scheduler"

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 👥 **Member Management**

### **Method 1: Admin Panel (Recommended)**

1. **Access Admin Panel**: Click "Admin Panel" button in the app
2. **Update Members Section**: Paste your member list in JSON format
3. **Click "Update Members & Regenerate Schedule"**

### **Method 2: Direct File Edit**

Edit `server/index.js`:
```javascript
let groupMembers = [
  { name: "Dr. Real Name 1", email: "real.email1@institution.edu" },
  { name: "Prof. Real Name 2", email: "real.email2@institution.edu" },
  { name: "Dr. Real Name 3", email: "real.email3@institution.edu" },
  // ... add all your members
];
```

### **Method 3: Environment Variables**

Create `.env` file:
```env
GROUP_MEMBERS=[{"name":"Dr. Real Name 1","email":"real.email1@institution.edu"},{"name":"Prof. Real Name 2","email":"real.email2@institution.edu"}]
```

---

## 🔄 **Schedule Regeneration**

### **Automatic Regeneration**
- **When updating members**: Schedule automatically regenerates
- **When starting server**: Fresh schedule is generated
- **Every Friday**: System checks and may generate new rounds

### **Manual Regeneration**

#### **Via Admin Panel**
1. Open Admin Panel
2. Go to "Regenerate Schedule" section
3. Set start date (default: 2025-09-08)
4. Click "Regenerate Schedule"

#### **Via API**
```bash
curl -X POST http://localhost:3001/api/admin/regenerate-schedule \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-09-08"}'
```

---

## 🎛️ **Admin Panel Usage**

### **Accessing Admin Panel**
- Click "Admin Panel" button in the main interface
- **Only visible after admin login** (using `AdminChen01234`)
- Regular users (`BiospecParty`) cannot see or access Admin Panel

### **Features Available**

#### **📊 Current Status**
- Shows member count, meeting count, and current round
- Real-time information about your schedule

#### **👥 Update Members**
- **JSON Input**: Paste your member list in JSON format
- **Validation**: Checks for proper name and email format
- **Auto-regeneration**: Schedule updates automatically

#### **📅 Regenerate Schedule**
- **Custom Start Date**: Choose when to start the schedule
- **Fresh Randomization**: Completely new presenter assignments
- **Round Reset**: Starts from round 1

#### **📤 Export/Import**
- **Export**: Download current member list
- **Copy to Clipboard**: Quick copy for sharing
- **Backup**: Save your member data

### **JSON Format for Members**
```json
[
  {
    "name": "Dr. Real Name 1",
    "email": "real.email1@institution.edu"
  },
  {
    "name": "Prof. Real Name 2", 
    "email": "real.email2@institution.edu"
  }
]
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Email Not Sending**
```bash
# Check Gmail settings
1. Enable 2-Factor Authentication
2. Generate App Password
3. Use App Password in .env file
```

#### **Port Conflicts**
```bash
# Check what's using port 3001
lsof -i :3001

# Kill conflicting process
kill -9 PID_NUMBER
```

#### **Schedule Not Updating**
```bash
# Check server logs
npm run server

# Verify API endpoints
curl http://localhost:3001/api/schedule
```

#### **Admin Panel Not Working**
```bash
# Check browser console for errors
# Verify server is running
# Check network tab for failed requests
```

### **Debug Commands**

#### **Test Server Health**
```bash
# Check if server responds
curl http://localhost:3001/api/schedule

# Test login
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"passcode":"BiospecParty"}'
```

#### **Check Environment**
```bash
# Verify .env file exists
ls -la .env

# Check environment variables
echo $EMAIL_USER
echo $EMAIL_PASS
```

---

## 📚 **Quick Reference**

### **Essential Commands**
```bash
# Development
npm run dev              # Start both frontend and backend
npm run server           # Backend only
npm run client           # Frontend only

# Production
npm run build            # Build frontend
npm start                # Start production server

# Admin
# Use Admin Panel in the web interface
```

### **File Locations**
- **Backend**: `server/index.js`
- **Frontend**: `client/src/App.js`
- **Configuration**: `.env`
- **Dependencies**: `package.json`

### **Default Credentials**
- **User Passcode**: `BiospecParty` (Schedule viewing, basic operations)
- **Admin Passcode**: `AdminChen01234` (Full access including Admin Panel)
- **Port**: 3001 (backend), 3000 (frontend)
- **Start Date**: 2025-09-08

---

## 🎯 **Best Practices**

1. **Keep Repository Private**: Contains sensitive passcode
2. **Use Environment Variables**: Never commit `.env` files
3. **Regular Backups**: Export member list periodically
4. **Test Changes**: Verify functionality before deployment
5. **Monitor Logs**: Check server logs for issues

---

## 📞 **Support**

- **Check Logs**: Server console and browser console
- **Verify API**: Test endpoints with curl commands
- **Review Code**: Check for syntax errors
- **Environment**: Ensure all variables are set correctly

---

**🎉 Your meeting scheduler is now ready for production use!**
