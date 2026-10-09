import React, { useState, useEffect } from 'react';
import { 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  X, 
  ExternalLink, 
  RotateCw, 
  LogOut, 
  MapPin, 
  Search, 
  Filter,
  Send,
  Clock,
  Sparkles
} from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../apiConfig';

// Fallback seed reports in case backend is freshly launched with empty DB
const SAMPLE_REPORTS = [
  {
    id: 101,
    latitude: 24.817012,
    longitude: 93.936841,
    damage_type: "Pothole",
    severity_score: 0.89,
    status: "reported",
    description: "Deep pothole near Keishamthong bridge intersection causing two-wheeler skids and traffic jam.",
    image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
    created_at: "2026-10-07T14:30:00"
  },
  {
    id: 102,
    latitude: 24.821455,
    longitude: 93.945210,
    damage_type: "Drainage System Failure",
    severity_score: 0.84,
    status: "reported",
    description: "Storm drain blockage spilling water across Kangla Western gate arterial road during morning rush.",
    image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
    created_at: "2026-10-07T15:15:00"
  },
  {
    id: 103,
    latitude: 24.795123,
    longitude: 93.921389,
    damage_type: "Crack",
    severity_score: 0.48,
    status: "reported",
    description: "Longitudinal surface fissures developing along Singjamei market bypass road edge.",
    image_url: "https://images.unsplash.com/photo-1584463699052-1f4a47ef0eef?w=800",
    created_at: "2026-10-07T16:00:00"
  }
];

export function AuthorityDashboard({ user, lang, t, onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'critical', 'pending', 'addressed'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Full-screen modal media state & multi-image gallery for clusters
  const [fullScreenMedia, setFullScreenMedia] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [currentClusterMedia, setCurrentClusterMedia] = useState([]);

  // Automated feedback notification banner state
  const [notificationMsg, setNotificationMsg] = useState(null);

  useEffect(() => {
    fetchReports();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFullScreenMedia(null);
      } else if (e.key === 'ArrowRight') {
        setGalleryIndex((prev) => {
          if (currentClusterMedia.length <= 1) return prev;
          const next = (prev + 1) % currentClusterMedia.length;
          setFullScreenMedia(resolveImageUrl(currentClusterMedia[next].image_url));
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setGalleryIndex((prev) => {
          if (currentClusterMedia.length <= 1) return prev;
          const next = (prev - 1 + currentClusterMedia.length) % currentClusterMedia.length;
          setFullScreenMedia(resolveImageUrl(currentClusterMedia[next].image_url));
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentClusterMedia]);

  const getLocalCitizenReports = () => {
    const list = [];
    try {
      const activeStr = localStorage.getItem('road_ranger_citizen_user');
      if (activeStr) {
        const u = JSON.parse(activeStr);
        if (Array.isArray(u.complaints)) {
          list.push(...u.complaints);
        }
      }
      const storedUsers = localStorage.getItem('road_ranger_registered_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        users.forEach((u) => {
          if (Array.isArray(u.complaints)) {
            list.push(...u.complaints);
          }
        });
      }
    } catch (e) {}
    const seen = new Set();
    return list.filter((r) => {
      if (!r || !r.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  };

  const fetchReports = async () => {
    setLoading(true);
    const localCitizenReports = getLocalCitizenReports();
    const fallbackList = [...localCitizenReports, ...SAMPLE_REPORTS];

    try {
      const res = await fetch(`${API_BASE}/api/reports?cluster=true&order_by_severity=true`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const ids = new Set(data.map((d) => d.id));
          const unmergedLocal = localCitizenReports.filter((r) => !ids.has(r.id));
          setReports([...unmergedLocal, ...data]);
        } else {
          setReports(fallbackList);
        }
      } else {
        setReports(fallbackList);
      }
    } catch (err) {
      setReports(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for a clustered ticket
  const openGalleryModal = (report) => {
    const list = report.media_list && report.media_list.length > 0
      ? report.media_list
      : [{ report_id: report.id, image_url: report.image_url, reporter_name: report.reporter_name }];
    setCurrentClusterMedia(list);
    setGalleryIndex(0);
    setFullScreenMedia(resolveImageUrl(list[0].image_url));
  };

  const handleNextPhoto = (e) => {
    e?.stopPropagation();
    if (currentClusterMedia.length <= 1) return;
    const next = (galleryIndex + 1) % currentClusterMedia.length;
    setGalleryIndex(next);
    setFullScreenMedia(resolveImageUrl(currentClusterMedia[next].image_url));
  };

  const handlePrevPhoto = (e) => {
    e?.stopPropagation();
    if (currentClusterMedia.length <= 1) return;
    const prev = (galleryIndex - 1 + currentClusterMedia.length) % currentClusterMedia.length;
    setGalleryIndex(prev);
    setFullScreenMedia(resolveImageUrl(currentClusterMedia[prev].image_url));
  };

  // Authority Dynamic Click / Unclick Toggle Action Handler with Cascade
  const handleToggleStatus = async (report) => {
    const reportId = report.id;
    const currentStatus = report.status;
    const isCurrentlyAddressed = currentStatus === 'addressed';
    const nextStatus = isCurrentlyAddressed ? 'reported' : 'addressed';
    const reportIds = report.report_ids || [reportId];

    try {
      await fetch(`${API_BASE}/api/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          report_ids: reportIds
        })
      });
    } catch (err) {
      console.warn("Backend update failed, applying locally:", err);
    }

    // Sync to local state
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: nextStatus } : r))
    );

    // Sync to localStorage so citizen sees updated status
    try {
      const activeStr = localStorage.getItem('road_ranger_citizen_user');
      if (activeStr) {
        const u = JSON.parse(activeStr);
        if (Array.isArray(u.complaints)) {
          u.complaints = u.complaints.map((c) =>
            reportIds.includes(c.id) ? { ...c, status: nextStatus } : c
          );
          localStorage.setItem('road_ranger_citizen_user', JSON.stringify(u));
        }
      }
    } catch (e) {}

    const count = report.report_count || 1;
    if (nextStatus === 'addressed') {
      setNotificationMsg({
        reportId,
        type: 'addressed',
        title: t.automatedMsgTitle,
        text: `${t.automatedMsgText} (Cascaded update to ${count} citizen report${count > 1 ? 's' : ''})`,
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      setNotificationMsg({
        reportId,
        type: 'reverted',
        title: "Ticket Status Updated:",
        text: `${t.statusReverted} (#PWD-RR-${reportId})`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setTimeout(() => {
      setNotificationMsg((curr) => (curr?.reportId === reportId ? null : curr));
    }, 8000);
  };

  // AI Shortened Description utility
  const getAiSummary = (desc) => {
    if (!desc) return "No description provided.";
    if (desc.length <= 60) return desc;
    return desc.slice(0, 58) + "...";
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.damage_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(r.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterType === 'critical') return r.severity_score >= 0.70;
    if (filterType === 'pending') return r.status === 'reported';
    if (filterType === 'addressed') return r.status === 'addressed';
    return true;
  });

  // KPI Metrics
  const totalCount = reports.length;
  const criticalCount = reports.filter((r) => r.severity_score >= 0.70).length;
  const addressedCount = reports.filter((r) => r.status === 'addressed').length;

  return (
    <div className="auth-dashboard-container">
      {/* Top Navigation */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="pwd-logo-chip">PWD Officer Portal</div>
          <h1 className="dashboard-title">{t.dashboardTitle}</h1>
          <p className="officer-badge-info">
            Logged in: <strong>{user?.email || "officer@pwd.gov.in"}</strong> | Officer ID: <code>{user?.badgeCode || "PWD-MN-4091"}</code>
          </p>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={fetchReports} title="Reload Reports">
            <RotateCw size={16} className={loading ? "spin" : ""} />
            <span>{t.refreshData}</span>
          </button>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Automated Citizen Message Banner when Tick is clicked/unclicked */}
      {notificationMsg && (
        <div className={`automated-dispatch-alert ${notificationMsg.type === 'reverted' ? 'reverted-alert' : ''}`}>
          <div className="dispatch-alert-icon">
            <Send size={20} className={notificationMsg.type === 'reverted' ? 'text-amber-500' : 'text-emerald-500 animate-bounce'} />
          </div>
          <div className="dispatch-alert-content">
            <span className="dispatch-title">
              {notificationMsg.title} (Ticket #PWD-RR-{notificationMsg.reportId})
            </span>
            <p className="dispatch-body">"{notificationMsg.text}"</p>
            <span className="dispatch-time">
              {notificationMsg.type === 'addressed' 
                ? `Dispatched live to Citizen App/SMS at ${notificationMsg.timestamp}`
                : `Updated at ${notificationMsg.timestamp}`}
            </span>
          </div>
          <button className="dispatch-close-btn" onClick={() => setNotificationMsg(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <span className="kpi-label">{t.totalTickets}</span>
          <span className="kpi-value">{totalCount}</span>
          <span className="kpi-sub">Clustered road defect zones</span>
        </div>
        <div className="kpi-card critical">
          <span className="kpi-label">{t.criticalIssues}</span>
          <span className="kpi-value text-red-600">{criticalCount}</span>
          <span className="kpi-sub">Severity ≥ 70% (High Accident Risk)</span>
        </div>
        <div className="kpi-card addressed">
          <span className="kpi-label">{t.addressedIssues}</span>
          <span className="kpi-value text-emerald-600">{addressedCount}</span>
          <span className="kpi-sub">Acknowledged & citizens notified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="controls-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search damage type, keyword, or ticket ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {t.filterAll} ({reports.length})
          </button>
          <button
            className={`filter-btn ${filterType === 'critical' ? 'active' : ''}`}
            onClick={() => setFilterType('critical')}
          >
            {t.filterCritical} ({criticalCount})
          </button>
          <button
            className={`filter-btn ${filterType === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterType('pending')}
          >
            {t.filterPending} ({reports.filter(r => r.status === 'reported').length})
          </button>
          <button
            className={`filter-btn ${filterType === 'addressed' ? 'active' : ''}`}
            onClick={() => setFilterType('addressed')}
          >
            {t.filterAddressed} ({addressedCount})
          </button>
        </div>
      </div>

      {/* Prioritized Clustered Reports Table / List */}
      <div className="reports-table-card">
        {filteredReports.length === 0 ? (
          <div className="empty-reports-state">
            <p>{t.noReports}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>{t.ticketHeader}</th>
                  <th>{t.typeHeader}</th>
                  <th>{t.severityHeader}</th>
                  <th>{t.locationHeader}</th>
                  <th>{t.summaryHeader}</th>
                  <th>{t.mediaHeader}</th>
                  <th>{t.actionHeader}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const severityPercent = Math.round(report.severity_score * 100);
                  const isCritical = report.severity_score >= 0.70;
                  const isAddressed = report.status === 'addressed';
                  const citizenCount = report.report_count || 1;
                  const hasMultiplePhotos = report.media_list && report.media_list.length > 1;

                  return (
                    <tr 
                      key={report.id} 
                      className={`report-row ${isCritical ? 'critical-row' : ''} ${isAddressed ? 'addressed-row' : ''}`}
                    >
                      {/* Ticket ID & Prominent Cluster Report Count */}
                      <td className="ticket-cell">
                        <span className="ticket-tag">#RR-{report.id}</span>
                        <span className="ticket-status-pill">{report.status}</span>
                        {citizenCount > 1 && (
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              backgroundColor: '#ecfdf5', 
                              color: '#065f46', 
                              border: '1px solid #a7f3d0', 
                              padding: '0.15rem 0.45rem', 
                              borderRadius: '4px', 
                              fontSize: '0.7rem', 
                              fontWeight: 700 
                            }}
                          >
                            Reported by {citizenCount} citizens
                          </span>
                        )}
                      </td>

                      {/* Damage Type */}
                      <td className="type-cell">
                        <strong className="damage-name">{report.damage_type}</strong>
                        {report.reporter_name && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            Primary: {report.reporter_name}
                          </span>
                        )}
                      </td>

                      {/* AI Severity */}
                      <td className="severity-cell">
                        <div className="severity-pill-wrap">
                          <span className={`severity-score-pill ${isCritical ? 'high' : 'medium'}`}>
                            {severityPercent}%
                          </span>
                          <span className="severity-caption">
                            {isCritical ? "Critical Priority" : "Standard Priority"}
                          </span>
                        </div>
                      </td>

                      {/* Location Coordinates */}
                      <td className="location-cell">
                        <div className="coords-info">
                          <span>{report.latitude}, {report.longitude}</span>
                          <a
                            href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="coords-map-link"
                          >
                            <MapPin size={13} />
                            <span>{t.openMap}</span>
                          </a>
                        </div>
                      </td>

                      {/* Shortened Description */}
                      <td className="summary-cell">
                        <p className="summary-text" title={report.description}>
                          {getAiSummary(report.description)}
                        </p>
                      </td>

                      {/* Media Upload with Gallery Indicator (+N) */}
                      <td className="media-cell">
                        {(() => {
                          const rawMedia = report.image_url || report.media_url || (report.media_list?.[0]?.image_url);
                          const mediaSrc = resolveImageUrl(rawMedia);
                          return (
                            <div 
                              className="media-thumbnail-box"
                              onClick={() => openGalleryModal(report)}
                              title={hasMultiplePhotos ? `Click to view ${report.media_list.length} citizen photos` : "Click to view full screen"}
                              style={{ position: 'relative' }}
                            >
                              <img 
                                src={mediaSrc} 
                                alt={report.damage_type || "Road defect"} 
                                className="table-media-thumb" 
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80";
                                }}
                              />
                              {hasMultiplePhotos && (
                                <span 
                                  style={{
                                    position: 'absolute',
                                    bottom: '3px',
                                    right: '3px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                    color: '#ffffff',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    zIndex: 2
                                  }}
                                >
                                  +{report.media_list.length - 1}
                                </span>
                              )}
                              <div className="thumb-hover-overlay">
                                <Maximize2 size={16} />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Authority Action: Dynamic Click / Unclick Toggle Button */}
                      <td className="action-cell">
                        {isAddressed ? (
                          <button
                            type="button"
                            className="tick-action-btn addressed-toggle-btn"
                            onClick={() => handleToggleStatus(report)}
                            title={t.markedAddressed}
                          >
                            <span>{t.markedAddressed}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="tick-action-btn pending-toggle-btn"
                            onClick={() => handleToggleStatus(report)}
                            title={t.markAddressed}
                          >
                            <span>{t.markAddressed}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full-screen Media Modal with Gallery Carousel Navigation */}
      {fullScreenMedia && (
        <div className="fullscreen-modal-backdrop" onClick={() => setFullScreenMedia(null)}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', minWidth: '320px' }}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={() => setFullScreenMedia(null)}
              title="Close Full Screen (Esc)"
            >
              <X size={24} />
            </button>

            {/* Left Carousel Arrow */}
            {currentClusterMedia.length > 1 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  fontSize: '1.25rem',
                  fontWeight: 900
                }}
                title="Previous Image (Left Arrow)"
              >
                ‹
              </button>
            )}

            {/* Right Carousel Arrow */}
            {currentClusterMedia.length > 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 20,
                  fontSize: '1.25rem',
                  fontWeight: 900
                }}
                title="Next Image (Right Arrow)"
              >
                ›
              </button>
            )}

            <div className="modal-image-wrapper">
              <img 
                src={resolveImageUrl(fullScreenMedia)} 
                alt="Full Screen Defect View" 
                className="fullscreen-img" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=1200&auto=format&fit=crop&q=80";
                }}
              />
            </div>

            <div className="modal-footer-caption" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.5rem' }}>
              <span>
                {currentClusterMedia.length > 1 
                  ? `Photo ${galleryIndex + 1} of ${currentClusterMedia.length} (${currentClusterMedia[galleryIndex]?.reporter_name || 'Citizen Evidence'})`
                  : 'High-Resolution PWD Road Defect Inspection View'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Use ‹ and › keys or click arrows to view all photos
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
