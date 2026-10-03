import React from 'react';
import BookingVelocityGraph from './BookingVelocityGraph';
import { FaExternalLinkAlt, FaExclamationTriangle, FaCheckCircle, FaChartLine, FaBell } from 'react-icons/fa';

const DemandResult = ({ result, onAnalyze }) => {
    if (!result) return null;

    const { level, color, message, score, intelligence } = result;

    // Visual indicator position (0 to 100%)
    const percentage = intelligence?.demand_pct ?? 10;


    const colorMap = {
        COMFORTABLE: '#48bb78',
        RELAXED: '#4299e1',
        BUSY: '#ed8936',
        'VERY BUSY': '#e53e3e',
    };

    const activeColor = colorMap[level] || '#ccc';

    return (
        <div className={`result-container fade-in ${level === 'VERY BUSY' ? 'critical-alert' : ''}`}>
            <div className="demand-level" style={{ color: activeColor }}>
                {level}
            </div>

            <div className="indicator-bar-container">
                <div className="indicator-bar">
                    <div className="indicator-marker" style={{ left: `${percentage}%`, backgroundColor: activeColor }}></div>
                </div>
                <div className="indicator-labels">
                    <span>EMPTY</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>OKAY</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>BUSY</span>
                    <span>FULL</span>
                </div>
            </div>

            <p className="demand-message" style={{ fontSize: '1.2rem', fontWeight: '700' }}>{message}</p>

            {intelligence && (
                <div className="intelligence-container fade-in">
                    <div className="live-indicator">
                        <div className="pulse-dot"></div>
                        <span>LIVE UPDATES ACTIVE</span>
                    </div>

                    {intelligence.narrative && (
                        <div className="narrative-card">
                            <div className="narrative-title">
                                <FaChartLine size={14} />
                                <span>Travel Summary</span>
                            </div>
                            <p className="narrative-text">
                                {intelligence.narrative}
                            </p>
                        </div>
                    )}

                    <div className="alert-header">
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>
                            Smart Advice
                        </span>
                        <div className="risk-badge" style={{ backgroundColor: `${intelligence.risk_color}20`, color: intelligence.risk_color }}>
                            {intelligence.risk_level === 'Easy to Book' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                            {intelligence.risk_level}
                        </div>
                    </div>

                    <div className="intelligence-stats">
                        <div className="stat-card">
                            <span className="stat-label">Demand Load</span>
                            <span className="stat-value">{intelligence.demand_pct}%</span>
                            <small style={{ fontSize: '0.65rem', color: '#718096', display: 'block', marginTop: '2px' }}>
                                of capacity
                            </small>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Booking Status</span>
                            <span className="stat-value" style={{ color: intelligence.recent_velocity > intelligence.historical_velocity ? '#e53e3e' : '#48bb78' }}>
                                {intelligence.recent_velocity > intelligence.historical_velocity ? 'Rising Fast' : 'Stable'}
                            </span>
                        </div>
                    </div>

                    <div className="seat-progress-container">
                        <div className="progress-label-row">
                            <span style={{ color: '#4a5568' }}>Estimated Seats Left</span>
                            <span style={{ color: activeColor }}>{Math.max(0, 100 - intelligence.demand_pct)}%</span>
                        </div>
                        <div className="seat-progress-bar">
                            <div
                                className="seat-progress-fill"
                                style={{
                                    width: `${Math.max(0, 100 - intelligence.demand_pct)}%`,
                                    backgroundColor: activeColor
                                }}
                            ></div>
                        </div>
                    </div>

                    <div className="advisory-box" style={{ background: `${activeColor}10`, border: `1px solid ${activeColor}30` }}>
                        <div className="advisory-text" style={{ color: '#2d3748', fontWeight: '600' }}>
                            <span>💡</span>
                            <span>{intelligence.advisory_message}</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '15px' }}>
                        <a
                            href={intelligence.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="redirect-btn"
                        >
                            <FaExternalLinkAlt size={14} />
                            Book Now
                        </a>
                        <button
                            onClick={onAnalyze}
                            className="gemini-explain-btn"
                        >
                            <span>✨</span>
                            AI Explain
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DemandResult;
