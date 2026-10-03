import React from 'react';
import { FaClock, FaChartLine, FaExclamationTriangle, FaLightbulb } from 'react-icons/fa';

const BookingInsights = ({ intelligence, inputs, resultLevel }) => {
    if (!intelligence) return null;

    // Calculate days until travel (mock - in real app, would use actual travel date)
    const daysUntilTravel = 3; // Mock value


    // Optimal booking window
    const getBookingWindow = (daysUntilTravel, demandLevel) => {
        if (daysUntilTravel <= 1) {
            return { urgency: 'critical', message: 'Book immediately - Last minute bookings', color: '#e53e3e' };
        } else if (daysUntilTravel <= 3 && demandLevel === 'VERY BUSY') {
            return { urgency: 'high', message: 'Book now - Busier than usual', color: '#dd6b20' };
        } else if (daysUntilTravel <= 7) {
            return { urgency: 'moderate', message: 'Optimal booking window - Good prices', color: '#d69e2e' };
        } else {
            return { urgency: 'low', message: 'Early bird advantage - Best prices', color: '#38a169' };
        }
    };

    // Weather-adjusted recommendation
    const getWeatherRecommendation = (weather, travelType) => {
        if (weather === 'Extreme') {
            return {
                icon: '⚠️',
                message: 'Train recommended over Bus (safer in extreme weather)',
                severity: 'high'
            };
        } else if (weather === 'Rainy' && travelType === 'Bus') {
            return {
                icon: '🌧️',
                message: '30% higher delay probability for buses in rainy conditions',
                severity: 'moderate'
            };
        }
        return null;
    };

    // Crowd density forecast
    const getCrowdDensity = (demandLevel) => {
        const densities = {
            'COMFORTABLE': { percentage: 35, label: 'Plenty of space', color: '#38a169' },
            'RELAXED': { percentage: 60, label: 'Normal crowd', color: '#3182ce' },
            'BUSY': { percentage: 80, label: 'Busy - book soon', color: '#d69e2e' },
            'VERY BUSY': { percentage: 95, label: 'Very full - book now', color: '#e53e3e' }
        };
        return densities[demandLevel] || densities['NORMAL'];
    };

    // Availability score (0-100)
    const getAvailabilityScore = (demandLevel, daysUntilTravel) => {
        const baseScores = { 'COMFORTABLE': 85, 'RELAXED': 65, 'BUSY': 35, 'VERY BUSY': 15 };
        let score = baseScores[demandLevel] || 50;

        // Adjust for time urgency
        if (daysUntilTravel <= 1) score = Math.max(score - 20, 5);
        else if (daysUntilTravel <= 3) score = Math.max(score - 10, 10);

        return Math.min(Math.max(score, 0), 100);
    };

    const demandLevel = resultLevel || 'RELAXED';
    const bookingWindow = getBookingWindow(daysUntilTravel, demandLevel);
    const weatherRec = getWeatherRecommendation(inputs.weather, inputs.travel_type);
    const crowdDensity = getCrowdDensity(demandLevel);
    const availabilityScore = getAvailabilityScore(demandLevel, daysUntilTravel);

    return (
        <div style={{ marginTop: '25px' }}>
            {/* Availability Score Card */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: '#fff',
                marginBottom: '20px',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '5px' }}>Availability Score</div>
                        <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{availabilityScore}/100</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '5px' }}>
                            {availabilityScore > 70 ? '✅ Good availability' :
                                availabilityScore > 40 ? '⚠️ Limited seats' :
                                    '🔴 Very limited - Book now'}
                        </div>
                    </div>
                    <div style={{ fontSize: '4rem', opacity: 0.2 }}>
                        {availabilityScore > 70 ? '😊' : availabilityScore > 40 ? '😐' : '😰'}
                    </div>
                </div>
            </div>

            {/* Smart Insights Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>

                {/* Booking Window */}
                <div style={{
                    background: '#fff',
                    border: `2px solid ${bookingWindow.color}`,
                    borderRadius: '12px',
                    padding: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <FaClock color={bookingWindow.color} />
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase' }}>
                            Booking Window
                        </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: bookingWindow.color }}>
                        {bookingWindow.message}
                    </div>
                </div>

                {/* Crowd Density */}
                <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Expected Crowd
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, background: '#edf2f7', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${crowdDensity.percentage}%`,
                                height: '100%',
                                background: crowdDensity.color,
                                transition: 'width 1s ease'
                            }}></div>
                        </div>
                        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: crowdDensity.color }}>
                            {crowdDensity.percentage}%
                        </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '5px' }}>
                        {crowdDensity.label}
                    </div>
                </div>

                {/* Historical Pattern */}
                <div style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: '10px' }}>
                        Booking Pattern
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#2d3748', lineHeight: 1.5 }}>
                        <strong>{Math.round(intelligence.acceleration_rate * 100)}%</strong> faster than usual
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '5px' }}>
                        Based on last 30 days
                    </div>
                </div>
            </div>

            {/* Weather-Adjusted Recommendation */}
            {weatherRec && (
                <div style={{
                    background: weatherRec.severity === 'high' ? '#fff5f5' : '#fffaf0',
                    border: `1px solid ${weatherRec.severity === 'high' ? '#feb2b2' : '#fbd38d'}`,
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>{weatherRec.icon}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: '3px' }}>
                            Weather Advisory
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2d3748', fontWeight: '600' }}>
                            {weatherRec.message}
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Recommendations */}
            <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #bae6fd'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <FaLightbulb color="#0ea5e9" size={18} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>
                        Smart Recommendations
                    </span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#0c4a6e', lineHeight: 1.8 }}>
                    <li><strong>Consider nearby stations</strong> - Check alternative departure points within 15-20 km</li>
                    <li><strong>Off-peak travel</strong> - Consider departures between 2-4 PM for lower crowds</li>
                    {availabilityScore < 40 && (
                        <li><strong>Alternative Modes</strong> - Check for shared cabs or alternative transport if seats are low</li>
                    )}
                    {demandLevel === 'VERY HIGH' && inputs.travel_type === 'Train' && (
                        <li><strong>Try Tatkal booking</strong> - Opens 1 day before travel at 10 AM</li>
                    )}
                    {inputs.travel_type === 'Bus' && demandLevel === 'HIGH' && (
                        <li><strong>Multi-operator search</strong> - Check 3-4 bus operators for better availability</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default BookingInsights;
