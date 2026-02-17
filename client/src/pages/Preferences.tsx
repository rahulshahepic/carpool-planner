import { useState, useEffect, useCallback } from 'react';

interface Preference {
  direction: string;
  earliest_time: string;
  latest_time: string;
  days_of_week: number[];
  role: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DEFAULTS: Record<string, Preference> = {
  TO_WORK: {
    direction: 'TO_WORK',
    earliest_time: '07:00',
    latest_time: '08:30',
    days_of_week: [0, 1, 2, 3, 4],
    role: 'EITHER',
  },
  FROM_WORK: {
    direction: 'FROM_WORK',
    earliest_time: '17:00',
    latest_time: '18:30',
    days_of_week: [0, 1, 2, 3, 4],
    role: 'EITHER',
  },
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function PrefForm({
  direction,
  initial,
  onSave,
}: {
  direction: string;
  initial?: Preference;
  onSave: () => void;
}) {
  const [pref, setPref] = useState<Preference>(
    initial || DEFAULTS[direction]
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) setPref(initial);
  }, [initial]);

  const toggleDay = (day: number) => {
    setPref(p => ({
      ...p,
      days_of_week: p.days_of_week.includes(day)
        ? p.days_of_week.filter(d => d !== day)
        : [...p.days_of_week, day].sort(),
    }));
  };

  const validate = (): string | null => {
    if (pref.days_of_week.length === 0) {
      return 'Select at least one day.';
    }
    if (timeToMinutes(pref.latest_time) <= timeToMinutes(pref.earliest_time)) {
      return 'Latest departure must be after earliest departure.';
    }
    return null;
  };

  const handleSave = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pref),
      });
      if (res.ok) {
        setMessage('Saved!');
        onSave();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [pref, onSave]);

  return (
    <div className="card">
      <h2>{direction === 'TO_WORK' ? 'Commute to Work' : 'Commute from Work'}</h2>

      <div className="form-row">
        <div className="form-group">
          <label>Earliest departure</label>
          <input
            type="time"
            value={pref.earliest_time}
            onChange={e => setPref(p => ({ ...p, earliest_time: e.target.value }))}
            className="input"
          />
        </div>
        <div className="form-group">
          <label>Latest departure</label>
          <input
            type="time"
            value={pref.latest_time}
            onChange={e => setPref(p => ({ ...p, latest_time: e.target.value }))}
            className="input"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Days</label>
        <div className="day-picker">
          {DAYS.map((name, i) => (
            <button
              key={i}
              className={`day-btn ${pref.days_of_week.includes(i) ? 'active' : ''}`}
              onClick={() => toggleDay(i)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Role</label>
        <div className="role-picker">
          {(['DRIVER', 'RIDER', 'EITHER'] as const).map(role => (
            <button
              key={role}
              className={`role-btn ${pref.role === role ? 'active' : ''}`}
              onClick={() => setPref(p => ({ ...p, role }))}
            >
              {role === 'EITHER' ? 'Either' : role === 'DRIVER' ? 'Driver' : 'Rider'}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary">
        {saving ? 'Saving...' : 'Save'}
      </button>
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}

export default function Preferences() {
  const [prefs, setPrefs] = useState<Preference[]>([]);

  const loadPrefs = useCallback(async () => {
    const res = await fetch('/api/preferences');
    if (res.ok) setPrefs(await res.json());
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const toWork = prefs.find(p => p.direction === 'TO_WORK');
  const fromWork = prefs.find(p => p.direction === 'FROM_WORK');

  return (
    <div className="page">
      <h1>Commute Schedule</h1>
      <p className="text-muted">Set your typical commute windows. We'll match you with coworkers on the same schedule.</p>
      <PrefForm direction="TO_WORK" initial={toWork} onSave={loadPrefs} />
      <PrefForm direction="FROM_WORK" initial={fromWork} onSave={loadPrefs} />
    </div>
  );
}
