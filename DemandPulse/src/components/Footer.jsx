import React, { useState } from 'react';
import { FaInfoCircle, FaCog, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <footer className="app-footer" style={{ textAlign: 'center' }}>
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>

            <p className="disclaimer" style={{ marginBottom: '20px' }}>
                * Demand indication is based on historical travel patterns and current conditions.
            </p>

            {/* Horizontal Button Group */}
            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => toggleSection('about')}
                    style={{
                        padding: '10px 20px',
                        background: openSection === 'about'
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: openSection === 'about' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (openSection !== 'about') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (openSection !== 'about') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    <FaInfoCircle size={16} />
                    <span>About</span>
                </button>

                <button
                    onClick={() => toggleSection('how')}
                    style={{
                        padding: '10px 20px',
                        background: openSection === 'how'
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: openSection === 'how' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (openSection !== 'how') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (openSection !== 'how') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    <FaCog size={16} />
                    <span>How it works</span>
                </button>

                <button
                    onClick={() => toggleSection('contact')}
                    style={{
                        padding: '10px 20px',
                        background: openSection === 'contact'
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                        boxShadow: openSection === 'contact' ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        if (openSection !== 'contact') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (openSection !== 'contact') {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    <FaEnvelope size={16} />
                    <span>Contact</span>
                </button>
            </div>

            {/* Content Display */}
            {openSection && (
                <div style={{
                    maxWidth: '600px',
                    margin: '0 auto 20px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    lineHeight: '1.7',
                    color: '#fff',
                    textAlign: 'left',
                    animation: 'fadeIn 0.3s ease-out',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
                }}>
                    {openSection === 'about' && (
                        <>
                            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1.1rem', color: '#63b3ed' }}>
                                About DemandPulse
                            </h3>
                            <p style={{ margin: 0, color: '#e2e8f0' }}>
                                DemandPulse is an intelligent travel demand forecasting system built with machine learning.
                                It analyzes historical patterns, real-time weather data, and destination popularity to predict
                                travel demand with exceptional accuracy.
                            </p>
                        </>
                    )}

                    {openSection === 'how' && (
                        <>
                            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1.1rem', color: '#63b3ed' }}>
                                How It Works
                            </h3>
                            <ul style={{ paddingLeft: '20px', margin: 0, color: '#e2e8f0' }}>
                                <li><strong>Data-Driven:</strong> Learns from historical travel patterns</li>
                                <li><strong>Factor-Based:</strong> Combines Day, Weather, Season, Festival & Destination</li>
                                <li><strong>Real-Time:</strong> Integrates live weather forecasts via Open-Meteo API</li>
                                <li><strong>Location-Aware:</strong> Different cities have unique demand profiles</li>
                            </ul>
                        </>
                    )}

                    {openSection === 'contact' && (
                        <>
                            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1.1rem', color: '#63b3ed' }}>
                                Get in Touch
                            </h3>
                            <p style={{ marginBottom: '14px', color: '#e2e8f0' }}>
                                Have questions, feedback, or collaboration ideas?
                            </p>
                            <a
                                href="mailto:ashfaqulhaq0844@gmail.com"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 18px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.05)';
                                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)';
                                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                }}
                            >
                                <FaEnvelope />
                                ashfaqulhaq0844@gmail.com
                            </a>
                        </>
                    )}
                </div>
            )}

            <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: 0 }}>
                © 2026 DemandPulse | Built with React, FastAPI & Open-Meteo
            </p>
        </footer>
    );
};

export default Footer;
