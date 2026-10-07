import React from 'react';
import { UserCheck, ShieldAlert, Navigation, ArrowRight } from 'lucide-react';

export function RoleSelection({ onSelectRole, lang, t }) {
  return (
    <div className="role-selection-wrapper">
      <div className="role-hero-header">
        <div className="badge-pill">
          <Navigation size={14} className="icon-pulse" />
          <span>PWD Smart Governance</span>
        </div>
        <h1 className="hero-title">{t.whoAreYou}</h1>
        <p className="hero-subtitle">{t.whoAreYouSub}</p>
      </div>

      <div className="role-cards-container">
        {/* Citizen Option Card */}
        <div 
          className="role-card citizen-card"
          onClick={() => onSelectRole('citizen')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectRole('citizen')}
        >
          <div className="role-card-badge">Public Access</div>
          <div className="role-icon-box citizen-icon-bg">
            <UserCheck size={40} />
          </div>
          <h2 className="role-card-title">{t.citizen}</h2>
          <p className="role-card-desc">{t.citizenDesc}</p>
          <div className="role-features-list">
            <span className="pill-tag">📸 Photo / Video Upload</span>
            <span className="pill-tag">📍 Live GPS Pinning</span>
            <span className="pill-tag">🤖 Instant AI Defect Scoring</span>
          </div>
          <button className="role-action-btn citizen-btn">
            <span>Continue as Citizen</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Authority Option Card */}
        <div 
          className="role-card authority-card"
          onClick={() => onSelectRole('authority')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectRole('authority')}
        >
          <div className="role-card-badge auth-badge">Government Official</div>
          <div className="role-icon-box auth-icon-bg">
            <ShieldAlert size={40} />
          </div>
          <h2 className="role-card-title">{t.authority}</h2>
          <p className="role-card-desc">{t.authorityDesc}</p>
          <div className="role-features-list">
            <span className="pill-tag">⚡ AI Severity Queue</span>
            <span className="pill-tag">🔒 Officer Verification</span>
            <span className="pill-tag">✓ 1-Click Citizen Dispatch</span>
          </div>
          <button className="role-action-btn authority-btn">
            <span>Authority Portal Login</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
