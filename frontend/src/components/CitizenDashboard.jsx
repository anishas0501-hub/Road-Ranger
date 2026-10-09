import React, { useState, useRef } from 'react';
import { User, Phone, Award, Camera, ShieldCheck, LogOut, CheckCircle2, FileText, Sparkles, RotateCw } from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../apiConfig';

export function CitizenDashboard({ user, onUpdateUser, onLogout, t, lang }) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Avatar source resolution
  const resolvePhotoUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return resolveImageUrl(url);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoSuccess(false);

    // Read photo client-side via FileReader and persist in localStorage
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const updatedUser = { ...user, profile_photo_url: dataUrl };
      onUpdateUser(updatedUser);

      try {
        localStorage.setItem('road_ranger_citizen_user', JSON.stringify(updatedUser));
        const storedUsers = localStorage.getItem('road_ranger_registered_users');
        if (storedUsers) {
          const list = JSON.parse(storedUsers);
          const idx = list.findIndex((u) => u.id === user.id || u.username === user.username);
          if (idx !== -1) {
            list[idx] = updatedUser;
            localStorage.setItem('road_ranger_registered_users', JSON.stringify(list));
          }
        }
      } catch (err) {}

      setPhotoSuccess(true);
      setUploadingPhoto(false);
      setTimeout(() => setPhotoSuccess(false), 3000);
    };
    reader.onerror = () => {
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const initials = (user.full_name || 'Citizen User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="citizen-form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="form-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="portal-title">{t.navUserDashboard}</h1>
          <p className="portal-subtitle">PWD Civic Contributor Profile & Safety Rewards</p>
        </div>
        <button
          type="button"
          className="logout-btn"
          onClick={onLogout}
          title="Sign out of Citizen session"
        >
          <LogOut size={16} />
          <span>{t.logout}</span>
        </button>
      </div>

      {/* Main Profile Info & Circular Avatar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', marginBottom: '2.5rem' }}>
        {/* Circular Profile Photo Placeholder with Upload Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#e2e8f0',
              border: '3px solid #10b981',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {user.profile_photo_url ? (
              <img
                src={resolvePhotoUrl(user.profile_photo_url)}
                alt={user.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#047857' }}>
                {initials}
              </div>
            )}

            {uploadingPhoto && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}
              >
                <RotateCw size={24} className="spin" />
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />

          <button
            type="button"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            <Camera size={14} />
            <span>{user.profile_photo_url ? t.changePhoto : t.addProfilePhoto}</span>
          </button>

          {photoSuccess && (
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
              Profile photo updated!
            </span>
          )}
        </div>

        {/* User Identity Details */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge-pill citizen-badge-pill" style={{ marginBottom: 0 }}>
              Verified Citizen Ranger
            </span>
            <span className="badge-pill" style={{ backgroundColor: '#f1f5f9', color: '#334155', marginBottom: 0 }}>
              @{user.username}
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
            {user.full_name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.95rem' }}>
            <Phone size={16} className="text-gray-500" />
            <span>+91 {user.mobile_number}</span>
          </div>
        </div>
      </div>

      {/* Reward Points Spotlight Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
            }}
          >
            <Award size={32} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#065f46', letterSpacing: '0.05em' }}>
              {t.totalRewardPoints}
            </span>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#064e3b', lineHeight: 1.1 }}>
              {user.reward_points || 0} <span style={{ fontSize: '1rem', fontWeight: 700, color: '#047857' }}>PTS</span>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '320px', fontSize: '0.85rem', color: '#065f46', lineHeight: 1.4 }}>
          <strong>PWD Civic Rewards Policy:</strong>
          <br />
          Each verified road damage report instantly credits <strong>+50 points</strong> to your account.
        </div>
      </div>

      {/* Account Details Grid */}
      <div className="success-details-grid" style={{ marginBottom: 0 }}>
        <div className="success-item">
          <span className="label">Citizen Name</span>
          <span className="value" style={{ fontWeight: 700, color: '#0f172a' }}>{user.full_name}</span>
        </div>
        <div className="success-item">
          <span className="label">Registered Mobile</span>
          <span className="value" style={{ fontWeight: 700, color: '#0f172a' }}>+91 {user.mobile_number}</span>
        </div>
        <div className="success-item">
          <span className="label">Account Username</span>
          <span className="value" style={{ fontWeight: 700, color: '#0f172a' }}>@{user.username}</span>
        </div>
        <div className="success-item">
          <span className="label">PWD Portal Status</span>
          <span className="status-badge-addressed">Active & Verified</span>
        </div>
      </div>
    </div>
  );
}
