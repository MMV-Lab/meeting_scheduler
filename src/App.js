import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, X, RotateCcw, Edit3 } from 'lucide-react';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [members, setMembers] = useState([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showDateChangeModal, setShowDateChangeModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [swapData, setSwapData] = useState({
    date1: '',
    presenter1: '',
    date2: '',
    presenter2: ''
  });
  const [newDate, setNewDate] = useState('');
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSchedule();
      fetchMembers();
    }
  }, [isAuthenticated]);

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/schedule');
      const data = await response.json();
      setSchedule(data);
      console.log('Schedule fetched:', data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setErrorMessage('Failed to fetch schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setIsAdmin(data.userType === 'admin');
        setErrorMessage('');
      } else {
        setErrorMessage('Invalid passcode. Please try again.');
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  const handleSwapPresenters = async () => {
    try {
      const response = await fetch('/api/swap-presenters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(swapData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(data.schedule);
        setShowSwapModal(false);
        setSwapData({ date1: '', presenter1: '', date2: '', presenter2: '' });
        setSuccessMessage('Presenters swapped successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('An error occurred while swapping presenters.');
    }
  };

  const handleSkipMeeting = async () => {
    if (!selectedMeeting) return;
    
    setIsLoading(true);
    try {
      console.log('Skipping meeting:', selectedMeeting.date);
      
      const response = await fetch('/api/skip-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedMeeting.date }),
      });
      
      const data = await response.json();
      console.log('Skip meeting response:', data);
      
      if (data.success) {
        setSchedule(data.schedule);
        setShowSkipModal(false);
        setSelectedMeeting(null);
        setSuccessMessage('Meeting skipped successfully! Presenters have been shifted forward.');
        setTimeout(() => setSuccessMessage(''), 5000);
        
        // Log the updated schedule for debugging
        console.log('Updated schedule after skipping:', data.schedule);
      } else {
        setErrorMessage(data.message || 'Failed to skip meeting');
      }
    } catch (error) {
      console.error('Error skipping meeting:', error);
      setErrorMessage('An error occurred while skipping the meeting.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeDate = async () => {
    if (!selectedMeeting || !newDate) return;
    
    try {
      const response = await fetch('/api/change-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          oldDate: selectedMeeting.date, 
          newDate: newDate 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(data.schedule);
        setShowDateChangeModal(false);
        setSelectedMeeting(null);
        setNewDate('');
        setSuccessMessage('Date changed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('An error occurred while changing the date.');
    }
  };

  // Admin functions
  const updateMembers = async (newMembers) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/update-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          members: newMembers,
          adminPasscode: passcode
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members);
        setSchedule(data.schedule);
        setSuccessMessage('Members updated and schedule regenerated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowAdminModal(false);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('An error occurred while updating members.');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateSchedule = async (startDate) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/regenerate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startDate,
          adminPasscode: passcode
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(data.schedule);
        setSuccessMessage('Schedule regenerated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(data.message);
      }
    } catch (error) {
      setErrorMessage('An error occurred while regenerating schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (member) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/add-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member, adminPasscode: passcode })
      });
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
        setSuccessMessage('Member added');
        setTimeout(() => setSuccessMessage(''), 3000);
        // Clear add-member inputs for convenience
        const nameEl = document.getElementById('newMemberName');
        const emailEl = document.getElementById('newMemberEmail');
        if (nameEl) nameEl.value = '';
        if (emailEl) emailEl.value = '';
        setErrorMessage('');
      } else {
        setErrorMessage(data.message || 'Failed to add member');
      }
    } catch (e) {
      setErrorMessage('An error occurred while adding member.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (name) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, adminPasscode: passcode })
      });
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
        setSchedule(data.schedule);
        setSuccessMessage('Member removed');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to remove member');
      }
    } catch (e) {
      setErrorMessage('An error occurred while removing member.');
    } finally {
      setIsLoading(false);
    }
  };

  const refillSchedule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/refill-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPasscode: passcode })
      });
      const data = await response.json();
      if (data.success) {
        setSchedule(data.schedule);
        setSuccessMessage('Schedule refilled');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to refill schedule');
      }
    } catch (e) {
      setErrorMessage('An error occurred while refilling schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPresenterReminder = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/send-presenter-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPasscode: passcode })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Presenter reminder sent');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to send presenter reminder');
      }
    } catch (e) {
      setErrorMessage('An error occurred while sending presenter reminder.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendEveryoneReminder = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/send-everyone-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPasscode: passcode })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Everyone reminder sent');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to send reminder to everyone');
      }
    } catch (e) {
      setErrorMessage('An error occurred while sending everyone reminder.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportMembers = async () => {
    try {
      const response = await fetch(`/api/admin/export-members?adminPasscode=${encodeURIComponent(passcode)}`);
      const data = await response.json();
      
      if (data.success) {
        const membersText = JSON.stringify(data.members, null, 2);
        navigator.clipboard.writeText(membersText);
        setSuccessMessage('Members exported and copied to clipboard!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to export members.');
    }
  };

  const openSwapModal = () => {
    setShowSwapModal(true);
    setErrorMessage('');
  };

  const openSkipModal = (meeting) => {
    setSelectedMeeting(meeting);
    setShowSkipModal(true);
    setErrorMessage('');
  };

  const openDateChangeModal = (meeting) => {
    setSelectedMeeting(meeting);
    setNewDate(meeting.date);
    setShowDateChangeModal(true);
    setErrorMessage('');
  };

  const openTimeChangeModal = (meeting) => {
    setSelectedMeeting(meeting);
    setNewTime(meeting.time || '09:00');
    setShowTimeChangeModal(true);
    setErrorMessage('');
  };

  const handleChangeTime = async () => {
    try {
      const response = await fetch('/api/change-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedMeeting.date,
          newTime: newTime,
          adminPasscode: passcode
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSchedule(data.schedule);
        setShowTimeChangeModal(false);
        setSelectedMeeting(null);
        setNewTime('');
        setSuccessMessage('Meeting time updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.message || 'Failed to update meeting time.');
      }
    } catch (error) {
      setErrorMessage('An error occurred while updating the meeting time.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <h1 className="app-title">Biospec Group Meeting Schedule</h1>
        <form className="passcode-form" onSubmit={handleLogin}>
          <input
            type="password"
            className="passcode-input"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
          />
          <button type="submit" className="login-button">
            Access Schedule
          </button>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="schedule-container">
        <div className="schedule-header">
          <h1 className="schedule-title">Biospec Group Meeting Schedule</h1>
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={openSwapModal}>
              <Users size={20} />
              Swap Presenters
            </button>
            <button className="btn btn-secondary" onClick={fetchSchedule} disabled={isLoading}>
              <RotateCcw size={20} className={isLoading ? 'loading' : ''} />
              {isLoading ? 'Refreshing...' : 'Refresh Schedule'}
            </button>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowAdminModal(true)}>
                <Users size={20} />
                Admin Panel
              </button>
            )}
          </div>
        </div>

        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        
        {/* Briefing information */}
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', color: 'white' }}>
          <strong>Briefing:</strong> Schedule has {schedule.length} meetings. 
          {schedule.length > 0 && ` Next meeting: ${schedule[0]?.date} with ${schedule[0]?.presenter1} and ${schedule[0]?.presenter2}`}
          <br />
          <small style={{ opacity: 0.8 }}>
            Access Level: {isAdmin ? '🛡️ Admin' : '👤 User'}
          </small>
        </div>

        <div className="schedule-table">
          <div className="table-header">
            <h2>🚀 Presentation Schedule 🕐</h2>
          </div>
          {schedule.map((meeting, index) => (
            <div key={index} className="table-row">
              <div className="table-cell date-cell">
                <Calendar size={18} />
                {format(new Date(meeting.date), 'MMM dd, yyyy')}
              </div>
              <div className="table-cell time-cell">
                <span className="time-display" style={{color: 'red', fontWeight: 'bold'}}>⏰ {meeting.time || '09:00'}</span>
                {isAdmin && (
                  <button
                    className="time-edit-btn"
                    onClick={() => openTimeChangeModal(meeting)}
                    title="Change meeting time"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
              <div className="table-cell presenter-cell">
                <Users size={18} />
                {meeting.presenter1}
              </div>
              <div className="table-cell presenter-cell">
                <Users size={18} />
                {meeting.presenter2}
              </div>
              <div className="table-cell action-cell">
                <button
                  className="action-btn"
                  onClick={() => openSkipModal(meeting)}
                  title="Skip this meeting"
                >
                  <X size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => openDateChangeModal(meeting)}
                  title="Change date"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swap Presenters Modal */}
      {showSwapModal && (
        <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Swap Presenters</h3>
              <button className="close-button" onClick={() => setShowSwapModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="swap-row">
              <div className="swap-row-title">First Meeting</div>
              <div className="swap-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <select
                    className="form-select"
                    value={swapData.date1}
                    onChange={(e) => setSwapData({...swapData, date1: e.target.value})}
                  >
                    <option value="">Select a date</option>
                    {schedule.map((meeting, index) => (
                      <option key={index} value={meeting.date}>
                        {format(new Date(meeting.date), 'MMM dd, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Presenter</label>
                  <select
                    className="form-select"
                    value={swapData.presenter1}
                    onChange={(e) => setSwapData({...swapData, presenter1: e.target.value})}
                  >
                    <option value="">Select a presenter</option>
                    {swapData.date1 && schedule.find(m => m.date === swapData.date1) && (
                      <>
                        <option value={schedule.find(m => m.date === swapData.date1).presenter1}>
                          {schedule.find(m => m.date === swapData.date1).presenter1}
                        </option>
                        <option value={schedule.find(m => m.date === swapData.date1).presenter2}>
                          {schedule.find(m => m.date === swapData.date1).presenter2}
                        </option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="swap-row">
              <div className="swap-row-title">Second Meeting</div>
              <div className="swap-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <select
                    className="form-select"
                    value={swapData.date2}
                    onChange={(e) => setSwapData({...swapData, date2: e.target.value})}
                  >
                    <option value="">Select a date</option>
                    {schedule.map((meeting, index) => (
                      <option key={index} value={meeting.date}>
                        {format(new Date(meeting.date), 'MMM dd, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Presenter</label>
                  <select
                    className="form-select"
                    value={swapData.presenter2}
                    onChange={(e) => setSwapData({...swapData, presenter2: e.target.value})}
                  >
                    <option value="">Select a presenter</option>
                    {swapData.date2 && schedule.find(m => m.date === swapData.date2) && (
                      <>
                        <option value={schedule.find(m => m.date === swapData.date2).presenter1}>
                          {schedule.find(m => m.date === swapData.date2).presenter1}
                        </option>
                        <option value={schedule.find(m => m.date === swapData.date2).presenter2}>
                          {schedule.find(m => m.date === swapData.date2).presenter2}
                        </option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {errorMessage && <div className="error-message">{errorMessage}</div>}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSwapModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSwapPresenters}
                disabled={!swapData.date1 || !swapData.presenter1 || !swapData.date2 || !swapData.presenter2}
              >
                Swap Confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Meeting Modal */}
      {showSkipModal && (
        <div className="modal-overlay" onClick={() => setShowSkipModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Skip Meeting</h3>
              <button className="close-button" onClick={() => setShowSkipModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <p>Are you sure you want to skip the meeting on {selectedMeeting && format(new Date(selectedMeeting.date), 'MMM dd, yyyy')}?</p>
            <p>This will shift all presenters forward by one slot, keeping the same number of meetings.</p>
            
            {errorMessage && <div className="error-message">{errorMessage}</div>}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSkipModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSkipMeeting}>
                Skip Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Date Modal */}
      {showDateChangeModal && (
        <div className="modal-overlay" onClick={() => setShowDateChangeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Meeting Date</h3>
              <button className="close-button" onClick={() => setShowDateChangeModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">New Date</label>
              <input
                type="date"
                className="form-input"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            
            <p>Changing this date will automatically adjust all subsequent meeting dates to maintain the two-week interval.</p>
            
            {errorMessage && <div className="error-message">{errorMessage}</div>}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDateChangeModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleChangeDate}
                disabled={!newDate}
              >
                Change Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Time Modal */}
      {showTimeChangeModal && (
        <div className="modal-overlay" onClick={() => setShowTimeChangeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Meeting Time</h3>
              <button className="close-button" onClick={() => setShowTimeChangeModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">New Time</label>
              <input
                type="time"
                className="form-input"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            
            <p>Changing this time will only affect the selected meeting.</p>
            
            {errorMessage && <div className="errorMessage">{errorMessage}</div>}
            
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowTimeChangeModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleChangeTime}
                disabled={!newTime}
              >
                Change Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Admin Panel</h3>
              <button className="close-button" onClick={() => setShowAdminModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="admin-section">
              <h4>📊 Current Status</h4>
              <p><strong>Members:</strong> {members.length}</p>
              <p><strong>Meetings:</strong> {schedule.length}</p>
              <p><strong>Current Round:</strong> {schedule.length > 0 ? Math.ceil(schedule.length / (members.length / 2)) : 0}</p>
            </div>

            <div className="admin-section">
              <h4>👥 Update Members</h4>
              <p>Paste your member list in JSON format:</p>
              <textarea
                className="form-input"
                rows="8"
                placeholder={`[
  {"name": "Dr. Real Name 1", "email": "real.email1@institution.edu"},
  {"name": "Prof. Real Name 2", "email": "real.email2@institution.edu"}
]`}
                id="membersInput"
              />
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  try {
                    const membersText = document.getElementById('membersInput').value;
                    const newMembers = JSON.parse(membersText);
                    updateMembers(newMembers);
                  } catch (error) {
                    setErrorMessage('Invalid JSON format. Please check your data.');
                  }
                }}
                style={{ marginTop: '1rem' }}
              >
                Update Members & Regenerate Schedule
              </button>
            </div>

            <div className="admin-section">
              <h4>📅 Regenerate Schedule</h4>
              <p>Start date for new schedule:</p>
              <input
                type="date"
                className="form-input"
                id="startDateInput"
                defaultValue="2025-09-08"
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  const startDate = document.getElementById('startDateInput').value;
                  regenerateSchedule(startDate);
                }}
                style={{ marginTop: '1rem' }}
              >
                Regenerate Schedule
              </button>
            </div>

            <div className="admin-section">
              <h4>📤 Export/Import</h4>
              <button 
                className="btn btn-secondary" 
                onClick={exportMembers}
                style={{ marginRight: '1rem' }}
              >
                Export Current Members
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(members, null, 2));
                  setSuccessMessage('Members copied to clipboard!');
                  setTimeout(() => setSuccessMessage(''), 3000);
                }}
              >
                Copy to Clipboard
              </button>
            </div>

            <div className="admin-section">
              <h4>👥 Current Members</h4>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {members.map((m) => (
                  <li key={m.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                    <span>{m.name} — <span style={{ opacity: 0.7 }}>{m.email}</span></span>
                    <button className="btn btn-secondary" onClick={() => removeMember(m.name)}>Remove</button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input className="form-input" placeholder="Full name" id="newMemberName" />
                <input className="form-input" placeholder="Email" id="newMemberEmail" />
                <button className="btn btn-primary" onClick={() => {
                  const name = document.getElementById('newMemberName').value.trim();
                  const email = document.getElementById('newMemberEmail').value.trim();
                  if (!name || !email) { setErrorMessage('Name and email are required'); return; }
                  addMember({ name, email });
                }}>Add</button>
              </div>
            </div>

            <div className="admin-section">
              <h4>🔄 Maintenance</h4>
              <button className="btn btn-secondary" onClick={refillSchedule} style={{ marginRight: '1rem' }}>Refill Schedule</button>
              <button className="btn" onClick={sendPresenterReminder} style={{ marginRight: '0.5rem' }}>Send Presenter Reminder</button>
              <button className="btn" onClick={sendEveryoneReminder}>Send Everyone Reminder</button>
            </div>

            {errorMessage && <div className="error-message">{errorMessage}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
