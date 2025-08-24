# Biospec Group Meeting Scheduler

A modern, beautiful web application for organizing and managing group meeting presentation schedules. Built with React, Node.js, and Express.

## Features

- 🔐 **Secure Access**: Password-protected access with customizable passcode
- 📅 **Automatic Scheduling**: Generates random presentation schedules every two weeks
- 📧 **Email Automation**: Automatic reminders sent every Friday
- 🔄 **Smart Rescheduling**: Automatically adjusts dates when meetings are skipped or rescheduled
- 👥 **Presenter Management**: Swap presenters between different meeting dates
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- 🎨 **Vivid Color Palette**: Modern design with smooth animations and gradients

## How It Works

1. **Initial Setup**: Generates a random presentation schedule starting from September 8th, 2025
2. **Weekly Automation**: Every Friday at 9 AM, the system:
   - Checks if there's a meeting the following Monday
   - Sends appropriate reminders to group members
   - Manages schedule updates and new round generation
3. **Schedule Management**: Users can swap presenters, skip meetings, and change dates
4. **Smart Rescheduling**: Automatically maintains two-week intervals when dates are changed

## Technology Stack

- **Frontend**: React 18, TypeScript, CSS3 with modern animations
- **Backend**: Node.js, Express.js
- **Email**: Nodemailer with Gmail integration
- **Scheduling**: Node-cron for automated tasks
- **Styling**: Custom CSS with glassmorphism effects and gradients

## Installation

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Gmail account (for email functionality)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd meeting_scheduler
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your email credentials:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Generate Gmail App Password**
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Generate an app password for "Mail"
   - Use this password in your `.env` file

5. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 3001) and React frontend (port 3000).

## Usage

### Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. Enter the passcode: `BiospecParty`
3. View and manage your presentation schedule

### Available Actions

- **View Schedule**: See all upcoming presentations with dates and presenters
- **Swap Presenters**: Exchange presenters between different meeting dates
- **Skip Meeting**: Remove a meeting and automatically adjust subsequent dates
- **Change Date**: Modify a meeting date and automatically adjust the schedule

### Email Automation

The system automatically sends emails every Friday:
- **Meeting Reminders**: Sent to all group members when a meeting is scheduled
- **Presentation Reminders**: Sent to upcoming presenters after a meeting occurs
- **Schedule Updates**: Notifications when new rounds are generated

## Configuration

### Group Members

Edit the `groupMembers` array in `server/index.js` to add or remove members:

```javascript
let groupMembers = [
  { name: "Dr. Sarah Johnson", email: "sarah.johnson@biospec.edu" },
  { name: "Prof. Michael Chen", email: "m.chen@biospec.edu" },
  // Add more members...
];
```

### Meeting Schedule

- **Frequency**: Every two weeks on Monday
- **Start Date**: September 8th, 2025 (configurable)
- **Presenters**: 2 per meeting
- **Auto-generation**: New rounds created when <1/3 of members haven't presented

### Passcode

Change the `PASSCODE` constant in `server/index.js`:

```javascript
const PASSCODE = "YourNewPasscode";
```

## Deployment

### GitHub (Recommended for Private Repos)

1. Create a private GitHub repository
2. Push your code:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

### Environment Variables for Production

- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASS`: Your Gmail app password
- `PORT`: Server port (optional, defaults to 3001)

## Security Considerations

- **Private Repository**: Keep the repository private due to hardcoded passcode
- **Environment Variables**: Never commit `.env` files
- **Email Security**: Use app passwords, not regular passwords
- **Access Control**: Consider implementing additional authentication for production

## Customization

### UI Colors and Styling

Edit `client/src/index.css` to customize:
- Color schemes
- Animations
- Typography
- Layout spacing

### Email Templates

Modify email content in `server/index.js`:
- Meeting reminders
- Presentation notifications
- Schedule updates

### Meeting Rules

Adjust scheduling logic in `server/index.js`:
- Meeting frequency
- Presenter count
- Round generation rules

## Troubleshooting

### Common Issues

1. **Email not sending**: Check Gmail app password and 2FA settings
2. **Port conflicts**: Change PORT in .env file
3. **Build errors**: Ensure Node.js version is 16+
4. **CORS issues**: Check server configuration

### Logs

Check server console for:
- Schedule generation logs
- Email sending status
- API request logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Create a GitHub issue with detailed information

---

**Built with ❤️ for the Biospec Group**
