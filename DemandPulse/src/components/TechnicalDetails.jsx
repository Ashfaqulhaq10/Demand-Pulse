import React, { useState } from 'react';

const TechnicalDetails = ({ result }) => {
    const [visible, setVisible] = useState(false);

    if (!result) return null;

    return (
        <div className="technical-section">
            <button
                className="toggle-tech-btn"
                onClick={() => setVisible(!visible)}
            >
                {visible ? 'Hide Technical Details' : 'Show Technical Details (Admin)'}
            </button>

            {visible && (
                <div className="tech-stats fade-in">
                    <div className="tech-row">
                        <span>Relative Pressure Score:</span>
                        <strong>{result.score.toFixed(3)}</strong>
                    </div>
                    <div className="tech-row">
                        <span>Historical Percentile:</span>
                        <strong>{result.percentile}% (Estimated)</strong>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalDetails;
