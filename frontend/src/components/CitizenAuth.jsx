import React, { useState } from 'react';
import { User, Phone, Lock, KeyRound, ChevronLeft, AlertCircle, CheckCircle2, UserCheck, Shield } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

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

  // Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!regMobile || regMobile.trim().length < 7) {
      setError("Please enter a valid mobile number.");
      return;
    }
    setError(null);
    setOtpSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: regMobile.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpSuccessMsg(`OTP sent! Use demo verification code: ${data.dummy_otp || '123456'}`);
        setRegOtp(data.dummy_otp || '123456'); // prefill demo OTP for user convenience
      } else {
        setError(data.detail || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      // Local fallback for offline/direct testing
      setOtpSent(true);
      setOtpSuccessMsg("OTP sent! Demo code: 123456");
      setRegOtp("123456");
    } finally {
      setOtpSending(false);
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('road_ranger_citizen_user', JSON.stringify(data));
        onLoginSuccess(data);
      } else {
        setError(data.detail || "Authentication failed. Please verify credentials.");
      }
    } catch (err) {
      setError("Unable to connect to Road-Ranger server. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!regOtp || regOtp.trim().length < 4) {
      setError("Please enter the verification OTP.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: regMobile.trim(),
          otp: regOtp.trim(),
          full_name: regFullName.trim(),
          username: regUsername.trim(),
          password: regPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('road_ranger_citizen_user', JSON.stringify(data));
        onLoginSuccess(data);
      } else {
        setError(data.detail || "Registration failed. Please check inputs.");
      }
    } catch (err) {
      setError("Server connection error during registration.");
    } finally {
      setLoading(false);
    }
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
