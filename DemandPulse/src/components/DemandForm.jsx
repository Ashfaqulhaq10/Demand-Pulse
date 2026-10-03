import React, { useState } from 'react';
import { FaCalendarAlt, FaKeyboard, FaMagic } from 'react-icons/fa';
import AutocompleteInput from './AutocompleteInput';

const DemandForm = ({ inputs, onInputChange, onCheck, isValid }) => {
    const [mode, setMode] = useState('manual'); // 'manual' | 'auto'
    const [autoData, setAutoData] = useState({ date: '', fromCity: '', toCity: '' });
    const [loading, setLoading] = useState(false);

    const handleAutoFetch = async () => {
        if (!autoData.date || !autoData.toCity) {
            alert("Please select a date and enter a destination.");
            return;
        }
        setLoading(true);
        try {
            const dateObj = new Date(autoData.date);
            const dayOfWeek = dateObj.getDay();
            const month = dateObj.getMonth();

            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const newDay = isWeekend ? 'Weekend' : 'Weekday';
            onInputChange('day', newDay);

            let newSeason = 'Winter';
            if (month >= 2 && month <= 5) newSeason = 'Summer';
            else if (month >= 6 && month <= 9) newSeason = 'Monsoon';
            onInputChange('season', newSeason);

            // Fetch dynamic holiday/festival status from backend
            try {
                const holidayRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/check-holiday`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: autoData.date })
                });
                const holidayData = await holidayRes.json();
                onInputChange('festival', holidayData.is_festival || 'No');
            } catch (festError) {
                console.error("Holiday fetch error:", festError);
                // Fallback to static list for common ones if backend fails
                const dateStr = autoData.date.slice(5);
                if (['12-25', '01-01', '10-31', '08-15'].includes(dateStr)) {
                    onInputChange('festival', 'Yes');
                } else {
                    onInputChange('festival', 'No');
                }
            }

            onInputChange('origin', autoData.fromCity);
            onInputChange('destination', autoData.toCity);

            // Instead of doing geocoding/forecast in the client we call our backend `/analyze` endpoint.
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            try {
                const anRes = await fetch(`${apiBase}/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location: autoData.toCity })
                });

                if (!anRes.ok) {
                    throw new Error(`backend returned ${anRes.status}`);
                }

                const anJson = await anRes.json();
                // map description to our three categories
                let newWeather = 'Normal';
                const desc = (anJson.weather_description || '').toLowerCase();
                if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('thunder')) {
                    newWeather = 'Rainy';
                } else if (desc.includes('storm') || desc.includes('extreme') || desc.includes('snow') || desc.includes('squall') || desc.includes('tornado')) {
                    newWeather = 'Extreme';
                }

                onInputChange('weather', newWeather);
                alert(`Auto-detected: ${newDay}, ${newSeason}, Weather updated for ${anJson.location}.`);
                setLoading(false);
                return;
            } catch (backendErr) {
                console.error('analyze call failed, falling back to Open-Meteo', backendErr);
                // fall through to original Open-Meteo logic below
            }

            // original Open-Meteo fallback (identical to earlier code) in case backend is unreachable
            const cityName = autoData.toCity
                .replace(/\s+(Junction|Jn|Central|City|Town|Station|Terminus|Road|Halt|Cabin|Yard)\s*$/i, '')
                .trim();

            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                // Fallback: Try with original name
                const fallbackRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(autoData.toCity)}&count=1&language=en&format=json`);
                const fallbackData = await fallbackRes.json();

                if (!fallbackData.results || fallbackData.results.length === 0) {
                    // Weather not available, but we can still set other fields
                    onInputChange('weather', 'Normal'); // Default to Normal
                    alert(`Auto-detected: ${newDay}, ${newSeason}.\n\nWeather data not available for "${autoData.toCity}". Defaulted to "Normal" - please adjust if needed.`);
                    setLoading(false);
                    return;
                }

                // Use fallback data
                const { latitude, longitude } = fallbackData.results[0];
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code&start_date=${autoData.date}&end_date=${autoData.date}&timezone=auto`);
                const weatherData = await weatherRes.json();

                if (weatherData.daily && weatherData.daily.weather_code) {
                    const code = weatherData.daily.weather_code[0];
                    let newWeather = 'Normal';

                    if (code >= 51 && code <= 67) newWeather = 'Rainy';
                    else if (code >= 80 && code <= 82) newWeather = 'Rainy';
                    else if (code >= 95 || (code >= 71 && code <= 77)) newWeather = 'Extreme';

                    onInputChange('weather', newWeather);
                }

                alert(`Auto-detected: ${newDay}, ${newSeason}, Weather updated for ${fallbackData.results[0].name}.`);
                setLoading(false);
                return;
            }

            const { latitude, longitude } = geoData.results[0];

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code&start_date=${autoData.date}&end_date=${autoData.date}&timezone=auto`);
            const weatherData = await weatherRes.json();

            if (weatherData.daily && weatherData.daily.weather_code) {
                const code = weatherData.daily.weather_code[0];
                let newWeather = 'Normal';

                if (code >= 51 && code <= 67) newWeather = 'Rainy';
                else if (code >= 80 && code <= 82) newWeather = 'Rainy';
                else if (code >= 95 || (code >= 71 && code <= 77)) newWeather = 'Extreme';

                onInputChange('weather', newWeather);
            }

            alert(`Auto-detected: ${newDay}, ${newSeason}, Weather updated for ${geoData.results[0].name}.`);

        } catch (error) {
            console.error(error);
            alert("Failed to fetch real-world data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="demand-input-section">
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px', marginBottom: '20px' }}>
                <button
                    onClick={() => setMode('manual')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '6px',
                        background: mode === 'manual' ? '#fff' : 'transparent',
                        color: mode === 'manual' ? '#3182ce' : '#718096',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <FaKeyboard /> Manual
                </button>
                <button
                    onClick={() => setMode('auto')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        border: 'none',
                        borderRadius: '6px',
                        background: mode === 'auto' ? '#fff' : 'transparent',
                        color: mode === 'auto' ? '#3182ce' : '#718096',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <FaMagic /> Auto-Detect
                </button>
            </div>

            {mode === 'auto' && (
                <div className="auto-inputs fade-in" style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', overflow: 'visible' }}>
                    <div className="input-group">
                        <label>Travel Date</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '0 10px' }}>
                            <FaCalendarAlt color="#cbd5e0" />
                            <input
                                type="date"
                                style={{ border: 'none', padding: '10px', width: '100%', outline: 'none', color: '#2d3748' }}
                                value={autoData.date}
                                onChange={e => setAutoData({ ...autoData, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <AutocompleteInput
                            label="Origin"
                            placeholder="From Station"
                            value={autoData.fromCity}
                            onChange={val => setAutoData({ ...autoData, fromCity: val })}
                            transport={inputs.travel_type}
                        />
                        <AutocompleteInput
                            label="Destination"
                            placeholder="To Station"
                            value={autoData.toCity}
                            onChange={val => setAutoData({ ...autoData, toCity: val })}
                            transport={inputs.travel_type}
                        />
                    </div>
                    <button
                        className="check-btn"
                        style={{ marginTop: '10px', background: '#0ea5e9', fontSize: '0.95rem' }}
                        onClick={handleAutoFetch}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing Data...' : 'Smart Fetch & Auto-Fill'}
                    </button>
                </div>
            )}

            <AutocompleteInput
                label="Origin City"
                value={inputs.origin || ''}
                onChange={(val) => onInputChange('origin', val)}
                placeholder="Where are you starting from?"
                transport={inputs.travel_type}
            />

            <AutocompleteInput
                label="Destination City"
                value={inputs.destination || ''}
                onChange={(val) => onInputChange('destination', val)}
                placeholder="Search Railway Station (e.g. Ahmedabad)"
                transport={inputs.travel_type}
            />

            <div className="input-group">
                <label>Day Type</label>
                <select
                    value={inputs.day}
                    onChange={(e) => onInputChange('day', e.target.value)}
                >
                    <option value="">Select Day Type</option>
                    <option value="Weekday">Weekday</option>
                    <option value="Weekend">Weekend</option>
                    <option value="Holiday">Holiday</option>
                </select>
            </div>

            <div className="input-group">
                <label>Weather Condition</label>
                <select
                    value={inputs.weather}
                    onChange={(e) => onInputChange('weather', e.target.value)}
                >
                    <option value="">Select Weather</option>
                    <option value="Normal">Normal</option>
                    <option value="Rainy">Rainy</option>
                    <option value="Extreme">Extreme</option>
                </select>
            </div>

            <div className="input-group">
                <label>Festival</label>
                <select
                    value={inputs.festival}
                    onChange={(e) => onInputChange('festival', e.target.value)}
                >
                    <option value="">Select Festival Status</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            </div>

            {/* Only show manual Travel Type selection if not already determined by mode selector */}
            {!inputs.travel_type && (
                <div className="input-group">
                    <label>Travel Type</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button
                            type="button"
                            onClick={() => onInputChange('travel_type', 'Bus')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: inputs.travel_type === 'Bus' ? '2px solid #f97316' : '1px solid #cbd5e0',
                                background: inputs.travel_type === 'Bus' ? '#fff7ed' : '#fff',
                                color: inputs.travel_type === 'Bus' ? '#ea580c' : '#4a5568',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            🚌 Bus
                        </button>
                        <button
                            type="button"
                            onClick={() => onInputChange('travel_type', 'Train')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: inputs.travel_type === 'Train' ? '2px solid #3182ce' : '1px solid #cbd5e0',
                                background: inputs.travel_type === 'Train' ? '#ebf8ff' : '#fff',
                                color: inputs.travel_type === 'Train' ? '#3182ce' : '#4a5568',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            🚆 Train
                        </button>
                        <button
                            type="button"
                            onClick={() => onInputChange('travel_type', 'Flight')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: inputs.travel_type === 'Flight' ? '2px solid #8b5cf6' : '1px solid #cbd5e0',
                                background: inputs.travel_type === 'Flight' ? '#f5f3ff' : '#fff',
                                color: inputs.travel_type === 'Flight' ? '#7c3aed' : '#4a5568',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ✈️ Flight
                        </button>
                    </div>
                </div>
            )}

            <div className="input-group">
                <label>Season</label>
                <select
                    value={inputs.season}
                    onChange={(e) => onInputChange('season', e.target.value)}
                >
                    <option value="">Select Season</option>
                    <option value="Winter">Winter</option>
                    <option value="Summer">Summer</option>
                    <option value="Monsoon">Monsoon</option>
                </select>
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    id="notify-me"
                    checked={inputs.notify || false}
                    onChange={(e) => onInputChange('notify', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="notify-me" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: '600', color: '#4a5568' }}>
                    Notify me when tickets are selling fast
                </label>
            </div>

            <button
                className="check-btn"
                onClick={onCheck}
                disabled={!isValid}
            >
                Check Travel Demand
            </button>
        </div>
    );
};

export default DemandForm;
