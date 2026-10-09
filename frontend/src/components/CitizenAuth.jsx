import React, { useState } from 'react';
import { User, Phone, Lock, KeyRound, ChevronLeft, AlertCircle, CheckCircle2, UserCheck, Shield } from 'lucide-react';
import { API_BASE } from '../apiConfig';

export function CitizenAuth({ lang, t, onLoginSuccess, onBack }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('citizen_demo');
  const [loginPassword, setLoginPassword] = useState('DemoPassword#123');

  // Registration fields
  const [regMobile, setRegMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [error, setError] = useState(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState(null);

  // Send OTP (Purely client-side mock simulation)
  const handleSendOtp = (e) => {
    e?.preventDefault();
    if (!regMobile || regMobile.trim().length < 7) {
      setError("Please enter a valid mobile number.");
      return;
    }
    setError(null);
    setOtpSending(true);

    // Simulate 1-second delay, auto-fill demo OTP, and allow user to continue
    setTimeout(() => {
      setOtpSent(true);
      setRegOtp("123456");
      setOtpSuccessMsg("OTP sent! Verification code: 123456");
      setOtpSending(false);
    }, 1000);
  };

  // Login handler (Pure client-side authentication with localStorage)
  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      let matchedUser = null;
      const idQuery = loginIdentifier.trim().toLowerCase();

      try {
        // 1. Check registered users list in localStorage
        const storedUsers = localStorage.getItem('road_ranger_registered_users');
        if (storedUsers) {
          const list = JSON.parse(storedUsers);
          matchedUser = list.find(
            (u) =>
              (u.username && u.username.toLowerCase() === idQuery) ||
              (u.mobile_number && u.mobile_number === idQuery) ||
              (u.full_name && u.full_name.toLowerCase() === idQuery)
          );
        }

        // 2. Check active citizen user in localStorage
        if (!matchedUser) {
          const activeStr = localStorage.getItem('road_ranger_citizen_user');
          if (activeStr) {
            const active = JSON.parse(activeStr);
            if (
              (active.username && active.username.toLowerCase() === idQuery) ||
              (active.mobile_number && active.mobile_number === idQuery) ||
              (active.full_name && active.full_name.toLowerCase() === idQuery)
            ) {
              matchedUser = active;
            }
          }
        }
      } catch (err) {}

      // 3. Fallback: Accept any dummy credentials if none exist
      if (!matchedUser) {
        matchedUser = {
          id: Date.now(),
          full_name: loginIdentifier.trim() || 'Citizen Contributor',
          mobile_number: '9876543210',
          username: (loginIdentifier.trim() || 'citizen_user').toLowerCase().replace(/\s+/g, '_'),
          password: loginPassword || 'DemoPassword#123',
          profile_photo_url: null,
          reward_points: 0,
          complaints: []
        };
      }

      try {
        localStorage.setItem('road_ranger_citizen_user', JSON.stringify(matchedUser));
      } catch (err) {}

      setLoading(false);
      // Immediately log in and route directly to the Citizen Dashboard
      onLoginSuccess(matchedUser, 'dashboard');
    }, 350);
  };

  // Register handler (Pure client-side registration with localStorage)
  const handleRegister = (e) => {
    e.preventDefault();
    setError(null);

    if (!regFullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!regMobile.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!regUsername.trim()) {
      setError("Please choose a username.");
      return;
    }
    if (!regPassword) {
      setError("Please enter a password.");
      return;
    }
    if (!regOtp || regOtp.trim().length < 4) {
      setError("Please enter the 4-6 digit verification OTP (e.g. 123456).");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const newUser = {
        id: Date.now(),
        full_name: regFullName.trim(),
        mobile_number: regMobile.trim(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        profile_photo_url: null,
        reward_points: 0,
        complaints: []
      };

      try {
        // Save to registered users list in localStorage
        const storedUsers = localStorage.getItem('road_ranger_registered_users');
        const usersList = storedUsers ? JSON.parse(storedUsers) : [];
        const filtered = usersList.filter(
          (u) => u.username !== newUser.username && u.mobile_number !== newUser.mobile_number
        );
        filtered.push(newUser);
        localStorage.setItem('road_ranger_registered_users', JSON.stringify(filtered));

        // Save active user in localStorage
        localStorage.setItem('road_ranger_citizen_user', JSON.stringify(newUser));
      } catch (err) {}

      setLoading(false);
      // Immediately log them in / redirect to the Citizen Dashboard
      onLoginSuccess(newUser, 'dashboard');
    }, 400);
  };

  // Quick fill demo user
  const setDemoCitizen = () => {
    setLoginIdentifier('citizen_demo');
    setLoginPassword('DemoPassword#123');
    setError(null);
  };

  return (
    <div className="auth-login-container">
      <div className="portal-top-bar">
        <button className="back-link-btn" onClick={onBack}>
          <ChevronLeft size={18} />
          <span>{t.backToHome}</span>
        </button>
        <span className="badge-pill citizen-badge-pill">PWD Citizen Portal</span>
      </div>

      <div className="auth-login-card">
        {/* Header matching Authority styling */}
        <div className="auth-card-header">
          <div className="auth-badge-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            {mode === 'login' ? <UserCheck size={36} /> : <Shield size={36} />}
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? t.citizenLoginTitle : t.citizenRegisterTitle}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login' ? t.citizenLoginSubtitle : t.citizenRegisterSubtitle}
          </p>
        </div>

        {/* Tab switch between Sign In and Register */}
        <div className="verify-toggle-buttons" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`toggle-sub-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            {t.signInBtn}
          </button>
          <button
            type="button"
            className={`toggle-sub-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            {t.citizenRegisterTitle}
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {otpSuccessMsg && mode === 'register' && (
          <div className="automated-dispatch-alert" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>{otpSuccessMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-group">
              <label className="input-label">
                <User size={16} />
                <span>{t.identifierLabel}</span>
              </label>
              <input
                type="text"
                className="text-input"
                placeholder={t.identifierPlaceholder}
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <Lock size={16} />
                <span>{t.passwordLabel}</span>
              </label>
              <input
                type="password"
                className="text-input"
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <div className="demo-credentials-note" style={{ cursor: 'pointer' }} onClick={setDemoCitizen}>
              <span>Note: {t.demoCitizenHint}</span>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              style={{ backgroundColor: '#059669' }}
              disabled={loading}
            >
              {loading ? t.signingIn : t.signInBtn}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center' }}
              onClick={() => { setMode('register'); setError(null); }}
            >
              {t.needAccount}
            </button>
          </form>
        )}

        {/* REGISTRATION FORM (Step 1: Mobile -> OTP, Step 2: Full Name, Username, Password) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            {/* Step 1: Mobile Number & Send OTP */}
            <div className="input-group">
              <label className="input-label">
                <Phone size={16} />
                <span>{t.mobileLabel}</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="tel"
                  className="text-input"
                  placeholder={t.mobilePlaceholder}
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  maxLength={15}
                  required
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}
                  onClick={handleSendOtp}
                  disabled={otpSending}
                >
                  {otpSending ? t.sendingOtp : t.sendOtp}
                </button>
              </div>
            </div>

            {/* OTP Input (Shown once Send OTP is requested or entered) */}
            {otpSent && (
              <div className="input-group animate-slide-in">
                <label className="input-label">
                  <KeyRound size={16} />
                  <span>{t.otpLabel}</span>
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder={t.otpPlaceholder}
                  maxLength={6}
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Step 2: Once OTP is present, reveal Full Name, Username, Password */}
            {otpSent && regOtp.trim().length >= 4 && (
              <div className="registration-revealed-fields animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group">
                  <label className="input-label">
                    <User size={16} />
                    <span>{t.fullNameLabel}</span>
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder={t.fullNamePlaceholder}
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <UserCheck size={16} />
                    <span>{t.usernameLabel}</span>
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder={t.usernamePlaceholder}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    <Lock size={16} />
                    <span>{t.passwordLabel}</span>
                  </label>
                  <input
                    type="password"
                    className="text-input"
                    placeholder="Create a secure password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  style={{ backgroundColor: '#059669' }}
                  disabled={loading}
                >
                  {loading ? t.creatingAccount : t.createAccount}
                </button>
              </div>
            )}

            {!otpSent && (
              <div className="demo-credentials-note">
                <span>Enter your mobile number and click <strong>"{t.sendOtp}"</strong> to begin.</span>
              </div>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center' }}
              onClick={() => { setMode('login'); setError(null); }}
            >
              {t.alreadyHaveAccount}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
