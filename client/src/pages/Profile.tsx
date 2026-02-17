import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [address, setAddress] = useState(user?.home_address || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Google Maps Places Autocomplete (New)
  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    const initAutocomplete = () => {
      if (!containerRef.current || !(window as any).google?.maps?.places) return;
      containerRef.current.innerHTML = '';

      const autocomplete = new (window as any).google.maps.places.PlaceAutocompleteElement({
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });

      autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
        const { place } = event;
        await place.fetchFields({ fields: ['formattedAddress'] });
        if (place.formattedAddress) {
          setAddress(place.formattedAddress);
        }
      });

      containerRef.current.appendChild(autocomplete);
    };

    fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        if (!config.mapsApiKey) return;
        if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
          initAutocomplete();
          return;
        }
        script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.mapsApiKey}&libraries=places&v=weekly`;
        script.async = true;
        script.onload = initAutocomplete;
        document.head.appendChild(script);
      });

    return () => {
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_address: address }),
      });
      if (res.ok) {
        await refreshUser();
        setMessage('Address saved!');
      } else {
        const err = await res.json();
        setMessage(err.error || 'Failed to save');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  }, [address, refreshUser]);

  return (
    <div className="page">
      <h1>Profile</h1>

      <div className="card">
        <div className="profile-info">
          {user?.avatar_url && <img src={user.avatar_url} alt="" className="avatar-large" />}
          <div>
            <h2>{user?.display_name}</h2>
            <p className="text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Home Address</h2>
        <p className="text-muted">
          Used to calculate your commute route. Your exact address is never shown to other users.
        </p>
        {address && (
          <p style={{ margin: '12px 0', fontWeight: 500 }}>{address}</p>
        )}
        <div className="form-group">
          <label>{address ? 'Change address' : 'Search for your address'}</label>
          <div ref={containerRef} className="autocomplete-container" />
        </div>
        <button onClick={handleSave} disabled={saving || !address} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Address'}
        </button>
        {message && <p className="form-message">{message}</p>}
      </div>
    </div>
  );
}
