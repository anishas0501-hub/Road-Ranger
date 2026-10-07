import React, { useState } from 'react';
import { translations } from './translations';
import { RoleSelection } from './components/RoleSelection';
import { CitizenPortal } from './components/CitizenPortal';
import { AuthorityLogin } from './components/AuthorityLogin';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { Languages, Shield, ChevronLeft } from 'lucide-react';
import './App.css';

function App() {
  const [lang, setLang] = useState('en'); // 'en' or 'mn'
  const [role, setRole] = useState(null); // null, 'citizen', or 'authority'
  const [authorityUser, setAuthorityUser] = useState(null);

  const t = translations[lang] || translations.en;

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'mn' : 'en'));
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
  };

  const handleBackToLanding = () => {
    setRole(null);
  };

  const handleAuthorityLoginSuccess = (userData) => {
    setAuthorityUser(userData);
  };

  const handleAuthorityLogout = () => {
    setAuthorityUser(null);
    setRole(null);
  };

  return (
    <div className="road-ranger-app">
      {/* Top Global Bar */}
      <nav className="global-navbar">
        <div className="navbar-brand" onClick={handleBackToLanding} role="button" tabIndex={0}>
          <div className="logo-icon-wrap">
            <Shield size={22} className="logo-icon" />
          </div>
          <div className="brand-texts">
            <span className="brand-name">{t.appName}</span>
            <span className="brand-sub">{t.pwdSub}</span>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Language Toggle Button */}
          <button 
            type="button" 
            className="language-toggle-btn" 
            onClick={toggleLanguage}
            title="Switch Language: English / Manipuri"
          >
            <Languages size={18} />
            <span className="lang-indicator">
              {lang === 'en' ? 'মৈতৈলোন্ (MN)' : 'English (EN)'}
            </span>
          </button>

          {role && (
            <button 
              type="button" 
              className="nav-switch-role-btn" 
              onClick={handleBackToLanding}
            >
              Switch Role
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-main-content">
        {!role && (
          <RoleSelection 
            onSelectRole={handleSelectRole} 
            lang={lang} 
            t={t} 
          />
        )}

        {role === 'citizen' && (
          <CitizenPortal 
            lang={lang} 
            t={t} 
            onBack={handleBackToLanding} 
          />
        )}

        {role === 'authority' && !authorityUser && (
          <AuthorityLogin 
            lang={lang} 
            t={t} 
            onLoginSuccess={handleAuthorityLoginSuccess} 
            onBack={handleBackToLanding} 
          />
        )}

        {role === 'authority' && authorityUser && (
          <AuthorityDashboard 
            user={authorityUser} 
            lang={lang} 
            t={t} 
            onLogout={handleAuthorityLogout} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>PWD AI Road Asset Monitoring System • PWD-01 Initiative</p>
      </footer>
    </div>
  );
}

export default App;
