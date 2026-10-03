import React from 'react';
import { FaBrain, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

const InsightCard = ({ factors, resultLevel }) => {
    if (!factors) return null;

    // Filter out "Base" and sort by impact (deviation from 1.0)
    const significantFactors = Object.entries(factors)
        .filter(([key]) => key !== 'Base')
        .map(([key, value]) => ({
            key,
            value,
            impact: value - 1.0, // > 0 positive, < 0 negative
            percent: Math.round((value - 1.0) * 100)
        }))
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)); // Sort by magnitude

    const mainFactor = significantFactors[0];

    // Generate explanation
    let explanation = "";
    if (Math.abs(mainFactor.percent) < 5) {
        explanation = "Everything looks normal today.";
    } else if (mainFactor.impact > 0) {
        explanation = `The main reason for crowd is: ${mainFactor.key}. It is up by ${mainFactor.percent}%.`;
    } else {
        explanation = `Travel is easier today because of ${mainFactor.key}. It is down by ${Math.abs(mainFactor.percent)}%.`;
    }

    return (
        <div style={{
            marginTop: '20px',
            background: 'rgba(0, 0, 0, 0.7)', // Much darker for contrast
            backdropFilter: 'blur(5px)',
            borderRadius: '12px',
            padding: '15px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'left',
            color: '#ffffff' // Explicit white
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <FaBrain style={{ color: '#63b3ed', marginRight: '8px' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#ffffff' }}>Smart Insights</h4>
            </div>

            <p style={{ fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.4' }}>
                {explanation}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {significantFactors.map((f) => (
                    <div key={f.key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        padding: '6px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px'
                    }}>
                        <span>{f.key}</span>
                        <span style={{
                            fontWeight: 'bold',
                            color: f.impact > 0.05 ? '#f6ad55' : (f.impact < -0.05 ? '#68d391' : '#cbd5e0')
                        }}>
                            {f.percent > 0 ? '+' : ''}{f.percent}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InsightCard;
