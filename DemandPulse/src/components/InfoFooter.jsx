import React, { useState } from 'react';
import { FaInfoCircle, FaCog, FaEnvelope, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const InfoFooter = () => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const AccordionItem = ({ id, icon, title, children }) => {
        const isOpen = openSection === id;
        return (
            <div style={{
                marginBottom: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <button
                    onClick={() => toggleSection(id)}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {icon}
                        <span>{title}</span>
                    </div>
                    {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                </button>

                {isOpen && (
                    <div style={{
                        padding: '16px 20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            marginTop: '40px',
            padding: '30px 20px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff'
        }}>
            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <AccordionItem
                id="about"
                icon={<FaInfoCircle color="#63b3ed" size={18} />}
                title="About DemandPulse"
            >
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#cbd5e0', margin: 0 }}>
                    DemandPulse is an intelligent travel demand forecasting system built with cutting-edge
                    machine learning. It analyzes historical patterns, real-time weather data, and destination
                    popularity to predict travel demand with exceptional accuracy.
                </p>
            </AccordionItem>

            <AccordionItem
                id="how"
                icon={<FaCog color="#63b3ed" size={18} />}
                title="How It Works"
            >
                <ul style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#cbd5e0', paddingLeft: '20px', margin: 0 }}>
                    <li><strong>Data-Driven:</strong> Learns from historical travel patterns</li>
                    <li><strong>Factor-Based:</strong> Combines Day, Weather, Season, Festival, and Destination</li>
                    <li><strong>Real-Time:</strong> Integrates live weather forecasts via Open-Meteo API</li>
                    <li><strong>Location-Aware:</strong> Different cities have unique demand profiles</li>
                </ul>
            </AccordionItem>

            <AccordionItem
                id="contact"
                icon={<FaEnvelope color="#63b3ed" size={18} />}
                title="Contact"
            >
                <div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#cbd5e0', marginBottom: '12px' }}>
                        Have questions or feedback? Get in touch!
                    </p>
                    <a
                        href="mailto:ashfaqulhaq0844@gmail.com"
                        style={{
                            display: 'inline-block',
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                        }}
                    >
                        📧 ashfaqulhaq0844@gmail.com
                    </a>
                </div>
            </AccordionItem>

            {/* Footer Bottom */}
            <div style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#a0aec0'
            }}>
                <p style={{ margin: 0 }}>© 2026 DemandPulse | Built with React, FastAPI & Open-Meteo | FD-SSR Algorithm</p>
            </div>
        </div>
    );
};

export default InfoFooter;
