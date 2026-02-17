import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Preference {
  direction: string;
  earliest_time: string;
  latest_time: string;
  days_of_week: number[];
  role: string;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preference[]>([]);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/preferences');
      if (res.ok) setPrefs(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  const hasAddress = !!user?.home_address;
  const hasSchedule = prefs.length > 0;
  const toWork = prefs.find(p => p.direction === 'TO_WORK');
  const fromWork = prefs.find(p => p.direction === 'FROM_WORK');

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.display_name?.split(' ')[0]}</h1>

      {hasSchedule && (
        <div className="card">
          <h2>Your Schedule</h2>
          <div className="schedule-summary">
            {toWork && (
              <div className="schedule-card">
                <h3>To Work</h3>
                <div className="schedule-detail">
                  <strong>{formatTime(toWork.earliest_time)} - {formatTime(toWork.latest_time)}</strong>
                  <br />
                  {toWork.days_of_week.map(d => DAY_NAMES[d]).join(', ')}
                  {' · '}
                  {toWork.role === 'EITHER' ? 'Driver or Rider' : toWork.role === 'DRIVER' ? 'Driver' : 'Rider'}
                </div>
              </div>
            )}
            {fromWork && (
              <div className="schedule-card">
                <h3>From Work</h3>
                <div className="schedule-detail">
                  <strong>{formatTime(fromWork.earliest_time)} - {formatTime(fromWork.latest_time)}</strong>
                  <br />
                  {fromWork.days_of_week.map(d => DAY_NAMES[d]).join(', ')}
                  {' · '}
                  {fromWork.role === 'EITHER' ? 'Driver or Rider' : fromWork.role === 'DRIVER' ? 'Driver' : 'Rider'}
                </div>
              </div>
            )}
          </div>
          <Link to="/preferences" className="btn btn-small" style={{ marginTop: 12 }}>Edit schedule</Link>
        </div>
      )}

      <div className="setup-checklist">
        <h2>Getting Started</h2>
        <div className="checklist">
          <div className={`checklist-item ${hasAddress ? 'done' : ''}`}>
            <span className="check">{hasAddress ? '✓' : '1'}</span>
            <div>
              <strong>Set your home address</strong>
              <p>We need this to calculate commute routes and find nearby matches.</p>
              <Link to="/profile" className="btn btn-small">
                {hasAddress ? 'Update address' : 'Add address'}
              </Link>
            </div>
          </div>

          <div className={`checklist-item ${hasSchedule ? 'done' : ''}`}>
            <span className="check">{hasSchedule ? '✓' : '2'}</span>
            <div>
              <strong>Set your commute schedule</strong>
              <p>Tell us when you commute and whether you can drive, ride, or either.</p>
              <Link to="/preferences" className="btn btn-small">
                {hasSchedule ? 'Update schedule' : 'Set schedule'}
              </Link>
            </div>
          </div>

          <div className="checklist-item">
            <span className="check">3</span>
            <div>
              <strong>Find matches</strong>
              <p>See coworkers whose routes and schedules overlap with yours.</p>
              <Link to="/matches" className="btn btn-small">View matches</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
