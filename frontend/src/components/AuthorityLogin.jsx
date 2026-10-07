import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, ChevronLeft, AlertCircle } from 'lucide-react';

export function AuthorityLogin({ lang, t, onLoginSuccess, onBack }) {
  const [email, setEmail] = useState('officer@pwd.gov.in');
  const [password, setPassword] = useState('GovSecure#2026');
  const [badgeCode, setBadgeCode] = useState('PWD-MN-4091');
  const [authMethod, setAuthMethod] = useState('badge'); // 'badge' or 'otp'
  const [otpToken, setOtpToken] = useState('849201');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      // Verification logic: ensure domain is official or authorized, and badge/otp is non-empty
      const isEmailValid = email.includes('@pwd.gov.in') || email.includes('@gov.in') || email.includes('admin');
      const isCodeValid = authMethod === 'badge' ? badgeCode.trim().length >= 4 : otpToken.trim().length === 6;

      if (!isEmailValid) {
        setError("Access Restricted: Only authorized @pwd.gov.in or government emails can access the command center.");
        setLoading(false);
        return;
      }

      if (!isCodeValid) {
        setError(authMethod === 'badge' ? "Invalid PWD Officer Badge Identifier." : "Invalid 6-digit Gov OTP Token.");
        setLoading(false);
        return;
      }

      // Login success
      setLoading(false);
      onLoginSuccess({
        email,
        badgeCode: authMethod === 'badge' ? badgeCode : `OTP-VERIFIED-${otpToken}`,
        role: "Senior Highway Inspector"
      });
    }, 600);
  };

  return (
    <div className="auth-login-container">
      <div className="portal-top-bar">
        <button className="back-link-btn" onClick={onBack}>
          <ChevronLeft size={18} />
          <span>{t.backToHome}</span>
        </button>
      </div>

      <div className="auth-login-card">
        <div className="auth-card-header">
          <div className="auth-badge-icon">
            <ShieldCheck size={36} className="text-blue-600" />
          </div>
          <h2 className="auth-title">{t.authLoginTitle}</h2>
          <p className="auth-subtitle">{t.authLoginSubtitle}</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          {/* Email input */}
          <div className="input-group">
            <label className="input-label">
              <Mail size={16} />
              <span>{t.emailLabel}</span>
            </label>
            <input 
              type="email"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer.name@pwd.gov.in"
              required
            />
          </div>

          {/* Password input */}
          <div className="input-group">
            <label className="input-label">
              <Lock size={16} />
              <span>{t.passwordLabel}</span>
            </label>
            <input 
              type="password"
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          {/* Verification Method toggle */}
          <div className="input-group">
            <label className="input-label">
              <KeyRound size={16} />
              <span>{t.verificationLabel}</span>
            </label>
            <div className="verify-toggle-buttons">
              <button
                type="button"
                className={`toggle-sub-btn ${authMethod === 'badge' ? 'active' : ''}`}
                onClick={() => setAuthMethod('badge')}
              >
                Officer Badge ID
              </button>
              <button
                type="button"
                className={`toggle-sub-btn ${authMethod === 'otp' ? 'active' : ''}`}
                onClick={() => setAuthMethod('otp')}
              >
                Gov 2FA Token (OTP)
              </button>
            </div>

            {authMethod === 'badge' ? (
              <input 
                type="text"
                className="text-input mt-2"
                value={badgeCode}
                onChange={(e) => setBadgeCode(e.target.value)}
                placeholder="e.g. PWD-MN-4091"
                required
              />
            ) : (
              <input 
                type="text"
                className="text-input mt-2"
                value={otpToken}
                maxLength={6}
                onChange={(e) => setOtpToken(e.target.value)}
                placeholder="Enter 6-digit OTP"
                required
              />
            )}
          </div>

          <div className="demo-credentials-note">
            💡 {t.demoCredentialsHint}
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Authenticating..." : t.loginBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
