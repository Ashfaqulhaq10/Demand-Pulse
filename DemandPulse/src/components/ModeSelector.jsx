import React from 'react';
import { FaSignOutAlt } from 'react-icons/fa';

const modes = [
    {
        id: 'Bus',
        icon: '🚌',
        label: 'Bus',
        subtitle: 'Inter-city & State Buses',
        color: '#f97316',
        glow: 'rgba(249,115,22,0.35)',
        gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        border: '#fed7aa',
    },
    {
        id: 'Train',
        icon: '🚆',
        label: 'Train',
        subtitle: 'Indian Railways Network',
        color: '#3b82f6',
        glow: 'rgba(59,130,246,0.35)',
        gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '#bfdbfe',
    },
    {
        id: 'Flight',
        icon: '✈️',
        label: 'Flight',
        subtitle: 'Domestic Air Travel',
        color: '#8b5cf6',
        glow: 'rgba(139,92,246,0.35)',
        gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        border: '#ddd6fe',
    },
];

const ModeSelector = ({ user, onSelect, onLogout }) => {
    return (
        <div className="mode-selector-overlay">
            <div className="mode-selector-container fade-in">
                {/* Header */}
                <div className="mode-selector-header">
                    <div className="mode-logo">⚡</div>
                    <h1 className="mode-title">DemandPulse</h1>
                    <p className="mode-subtitle">
                        Welcome back, <strong>{user?.full_name}</strong>! <br />
                        Choose your mode of travel to check demand.
                    </p>
                </div>

                {/* Mode Cards */}
                <div className="mode-cards-grid">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            className="mode-card"
                            onClick={() => onSelect(m.id)}
                            style={{
                                '--card-color': m.color,
                                '--card-glow': m.glow,
                                '--card-gradient': m.gradient,
                                '--card-border': m.border,
                            }}
                        >
                            <div className="mode-card-icon">{m.icon}</div>
                            <div className="mode-card-label">{m.label}</div>
                            <div className="mode-card-sub">{m.subtitle}</div>
                            <div className="mode-card-arrow">→</div>
                        </button>
                    ))}
                </div>

                {/* Logout link */}
                <button className="mode-logout-btn" onClick={onLogout}>
                    <FaSignOutAlt className="logout-icon" />
                    <span>Sign out</span>
                </button>
            </div>
        </div>
    );
};

export default ModeSelector;
