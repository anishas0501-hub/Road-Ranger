import React, { useState, useEffect } from 'react';
import { RotateCw, Search, Send, Clock, AlertTriangle, ExternalLink, MapPin, Award } from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../apiConfig';

export function CitizenTrackReports({ user, t, lang }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'reported', 'addressed'

  const loadLocalReports = () => {
    let localList = [];
    try {
      // 1. Check user.complaints
      if (user?.complaints && Array.isArray(user.complaints) && user.complaints.length > 0) {
        localList = user.complaints;
      } else {
        // 2. Check dedicated user reports in localStorage
        const saved = localStorage.getItem(`road_ranger_reports_${user?.id}`);
        if (saved) {
          localList = JSON.parse(saved);
        } else {
          // 3. Check active citizen user in localStorage
          const activeStr = localStorage.getItem('road_ranger_citizen_user');
          if (activeStr) {
            const active = JSON.parse(activeStr);
            if (active.complaints && Array.isArray(active.complaints)) {
              localList = active.complaints;
            }
          }
        }
      }
    } catch (e) {}
    return localList;
  };

  const fetchUserReports = async () => {
    setLoading(true);
    const localList = loadLocalReports();
    setReports(localList);

    // Optional background check with backend
    try {
      if (user?.id) {
        const res = await fetch(`${API_BASE}/api/reports?user_id=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const localIds = new Set(localList.map((r) => r.id));
            const merged = [...localList, ...data.filter((r) => !localIds.has(r.id))];
            setReports(merged);
          }
        }
      }
    } catch (err) {
      // Backend unavailable; local reports already set seamlessly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReports();
  }, [user?.id, user?.complaints]);

  const filteredReports = reports.filter((r) => {
    const matchesSearch = searchId.trim() === '' || 
      String(r.id).includes(searchId.replace(/[^0-9]/g, '')) ||
      r.damage_type.toLowerCase().includes(searchId.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="citizen-form-card" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="form-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="portal-title">{t.navTrackReports}</h1>
          <p className="portal-subtitle">Real-time status of your civic road defect submissions</p>
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={fetchUserReports}
          disabled={loading}
          title="Refresh reports"
        >
          <RotateCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div className="search-box" style={{ maxWidth: '300px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ID or defect..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Submissions ({reports.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'reported' ? 'active' : ''}`}
            onClick={() => setStatusFilter('reported')}
          >
            Pending Review ({reports.filter(r => r.status === 'reported').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'addressed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('addressed')}
          >
            Addressed / Fixed ({reports.filter(r => r.status === 'addressed').length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading && reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          <RotateCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading your reports from PWD database...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <AlertTriangle size={36} className="text-gray-400" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
            {reports.length === 0 ? t.noUserReports : "No reports match your search filter."}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {reports.length === 0 
              ? "Submit your first road damage report using the 'Report Road Damage' tab to earn +50 points!" 
              : "Try adjusting your search query or status filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredReports.map((report) => (
            <div key={report.id} className="tracked-result-card animate-slide-in" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="tracked-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="ticket-tag">#PWD-RR-{report.id}</span>
                    <span className="badge-pill" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>
                      +50 PTS Earned
                    </span>
                  </div>
                  <h3 className="tracked-damage-type">{report.damage_type}</h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    className={report.status === 'addressed' ? 'status-badge-addressed' : 'status-badge-pending'}
                    style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
                  >
                    {report.status === 'addressed' ? t.statusAddressedCitizen : 'Reported • In Queue'}
                  </span>
                </div>
              </div>

              {/* AUTOMATED CITIZEN MESSAGE BANNER INTEGRATION IF ADDRESSED */}
              {report.status === 'addressed' ? (
                <div className="citizen-official-message-banner" style={{ margin: '1rem 0' }}>
                  <div className="citizen-message-banner-top">
                    <span className="pwd-live-pill">
                      <Send size={14} className="animate-pulse" />
                      {t.officialNotice}
                    </span>
                    <span className="live-status-tag">Delivered to Citizen App</span>
                  </div>
                  <div className="citizen-message-body">
                    "{t.automatedMsgText}"
                  </div>
                  <div className="citizen-message-sub">
                    <span>Ticket marked Addressed by PWD Highway Division. Actions scheduled within 4-6 business days.</span>
                  </div>
                </div>
              ) : (
                <div className="citizen-pending-notice" style={{ margin: '0.75rem 0' }}>
                  <Clock size={16} className="text-amber-600" />
                  <span>Status: Awaiting PWD Inspection • Real-time authority updates will appear here automatically</span>
                </div>
              )}

              {/* Content Grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1rem', alignItems: 'flex-start' }}>
                {report.image_url && (
                  <div style={{ width: '130px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <img
                      src={resolveImageUrl(report.image_url)}
                      alt={report.damage_type}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=400";
                      }}
                    />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                    {report.description || "Reported via Road-Ranger Citizen Portal"}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={13} className="text-emerald-600" />
                      <span>{report.latitude}, {report.longitude}</span>
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="map-view-link"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <span>Maps</span>
                      <ExternalLink size={11} />
                    </a>

                    <div style={{ fontWeight: 600, color: report.severity_score > 0.7 ? '#dc2626' : '#d97706' }}>
                      AI Severity: {Math.round(report.severity_score * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
