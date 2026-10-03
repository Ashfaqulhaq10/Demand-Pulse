import { useState, useEffect, useCallback } from 'react';
import { FaExternalLinkAlt, FaExclamationTriangle, FaCheckCircle, FaChartLine, FaBell, FaTrash } from 'react-icons/fa';
import Header from './components/Header';
import DemandForm from './components/DemandForm';
import DemandResult from './components/DemandResult';
import InsightCard from './components/InsightCard';
import ForecastChart from './components/ForecastChart';
import TechnicalDetails from './components/TechnicalDetails';
import ThreeBackground from './components/ThreeBackground';
import BookingInsights from './components/BookingInsights';
import Footer from './components/Footer';
import Login from './components/Login';
import ModeSelector from './components/ModeSelector';
import GeminiChat from './components/GeminiChat';
import './index.css';

function App() {
    const [inputs, setInputs] = useState({
        day: '',
        weather: '',
        festival: '',
        season: '',
        origin: '',
        destination: '',
        travel_type: 'Bus', // Matching backend
        notify: false,
    });

    const [result, setResult] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('dp_user');
        return saved ? JSON.parse(saved) : null;
    });
    // null = not yet chosen (show ModeSelector), string = chosen mode
    const [selectedMode, setSelectedMode] = useState(null);
    const [geminiTrigger, setGeminiTrigger] = useState(null);

    const handleAuth = (userData) => {
        setUser(userData);
        localStorage.setItem('dp_user', JSON.stringify(userData));
        setSelectedMode(null); // Always show mode picker on fresh login
    };

    const handleModeSelect = (mode) => {
        setSelectedMode(mode);
        handleInputChange('travel_type', mode);
        setResult(null);
        setAlerts([]); // Clear alerts when switching mode to avoid leakage
    };

    const handleLogout = async () => {
        if (user) {
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user.username })
                });
            } catch (error) {
                console.error("Logout report failed", error);
            }
        }
        setUser(null);
        setSelectedMode(null);
        localStorage.removeItem('dp_user');
    };

    // API URL constant
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: value }));
        setResult(null); // Reset result on change
    };

    const isFormValid = inputs.day && inputs.weather && inputs.festival && inputs.season && inputs.travel_type && inputs.destination && inputs.origin;

    const calculateDemand = async () => {
        setResult(null); // Clear previous options

        // Use environment variable or fallback to localhost
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inputs),
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error: ${errorData.detail}`);
                return;
            }

            const data = await response.json();
            setResult(data);

            // Save searched origin/destination to user record in users.xlsx
            if (user && (inputs.origin || inputs.destination)) {
                try {
                    await fetch(`${API_URL}/update-preferences`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: user.username,
                            origin: inputs.origin,
                            destination: inputs.destination
                        })
                    });
                } catch (prefError) {
                    console.error("Failed to update user preferences:", prefError);
                }
            }

            // Auto-save route if notify is checked
            if (inputs.notify && inputs.destination) {
                handleSaveRoute(true);
            }

            // --- 3. Immersive Sound & TTS ---
            // Play a futuristic sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Sci-fi beep
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play blocked", e));

            // Speak the result
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(`${data.message}`);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                window.speechSynthesis.cancel(); // Stop previous
                window.speechSynthesis.speak(utterance);
            }

        } catch (error) {
            console.error("Failed to fetch demand:", error);
            alert("Failed to connect to backend service. Please ensure the backend is running.");
        }
    };
    const handleSaveRoute = async (isAuto = false) => {
        if (!user || !inputs.destination) return;

        try {
            const response = await fetch(`${API_URL}/save-route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    origin: inputs.origin || 'Search Location',
                    destination: inputs.destination,
                    travel_type: selectedMode || 'Bus'
                })
            });

            if (response.ok && !isAuto) {
                const data = await response.json();
                alert(data.message);
            }
        } catch (error) {
            console.error("Failed to save route:", error);
            if (!isAuto) alert("Failed to save route for alerts.");
        }
    };

    const fetchAlerts = useCallback(async () => {
        if (!user || !selectedMode) return;
        try {
            const response = await fetch(`${API_URL}/alerts?username=${user.username}&transport=${selectedMode}`);
            if (response.ok) {
                const data = await response.json();
                // Secondary safeguard: filter client-side just in case
                const filteredData = data.filter(a =>
                    a.travel_type && a.travel_type.toLowerCase() === selectedMode.toLowerCase()
                );

                if (filteredData.length > alerts.length) {
                    // New alerts detected!
                    const latest = filteredData[filteredData.length - 1];
                    // Trigger browser notification if supported
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification("DemandPulse Alert", { body: latest.message });
                    }
                }
                setAlerts(filteredData);
            }
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        }
    }, [API_URL, alerts.length, user, selectedMode]);

    const handleDeleteAlert = async (alertId) => {
        try {
            const response = await fetch(`${API_URL}/alerts/${alertId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setAlerts(prev => prev.filter(a => a.id !== alertId));
            }
        } catch (error) {
            console.error("Failed to delete alert:", error);
        }
    };

    useEffect(() => {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Poll for alerts every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        fetchAlerts(); // Initial fetch

        return () => clearInterval(interval);
    }, [fetchAlerts, user, selectedMode]);


    const handleAnalyzeResult = () => {
        if (!result) return;

        // Clean, concise prompt for Gemini
        const factors = result.factors ? Object.entries(result.factors)
            .filter(([key]) => key !== 'Base') // Exclude Base
            .map(([key, val]) => {
                const impact = Math.round((val - 1) * 100);
                const sign = impact >= 0 ? '+' : '';
                return `${key.replace('_', ' ')}: ${sign}${impact}%`;
            })
            .join(', ') : 'None';

        const prompt = `Can you analyze this traveler demand result for me?
Route: ${inputs.origin} to ${inputs.destination}
Day: ${inputs.day}, Travel: ${inputs.travel_type}
Weather: ${inputs.weather}, Season: ${inputs.season}
Prediction: ${result.demand} demand (${result.level} level)
Key Factors (Impact): ${factors}
Detailed Insight: ${result.message}

Please explain why the demand is ${result.level} in a detailed but easy to understand way for a traveler.`;

        setGeminiTrigger(prompt);
    };

    return (
        <>
            {!user && <Login onAuth={handleAuth} />}

            {/* Mode Selector: shown after login, before main app */}
            {user && !selectedMode && (
                <ModeSelector
                    user={user}
                    onSelect={handleModeSelect}
                    onLogout={handleLogout}
                />
            )}

            {user && selectedMode && (
                <div className="user-profile fade-in">
                    <div className="user-avatar">{user.full_name.charAt(0)}</div>
                    <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                    <button
                        className="change-mode-btn"
                        onClick={() => { setSelectedMode(null); setResult(null); setAlerts([]); }}
                        title="Switch transport mode"
                    >
                        {
                            selectedMode === 'Bus' ? '🚌' :
                                selectedMode === 'Train' ? '🚆' : '✈️'
                        } Change
                    </button>
                </div>
            )}

            {user && selectedMode && (
                <ThreeBackground
                    demandLevel={result ? result.level : 'LOW'}
                />
            )}
            {user && selectedMode && (
                <div className="app-container">
                    <div className="content-wrap">
                        <Header />

                        <main className="main-card">
                            <DemandForm
                                inputs={inputs}
                                onInputChange={handleInputChange}
                                onCheck={calculateDemand}
                                isValid={isFormValid}
                            />

                            <DemandResult
                                result={result}
                                onAnalyze={handleAnalyzeResult}
                            />

                            {alerts.length > 0 && (
                                <div className="alerts-section fade-in" style={{ marginTop: '20px', padding: '15px', background: '#fff5f5', borderRadius: '12px', border: '1px solid #feb2b2' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '1.2rem' }}>📢</span>
                                        <span style={{ fontWeight: '800', color: '#c53030', textTransform: 'uppercase', fontSize: '0.85rem' }}>Important Travel Alerts</span>
                                    </div>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {[...alerts].reverse().map((alert, idx) => (
                                            <div key={idx} className="alert-item" style={{ padding: '8px 0', borderBottom: idx < alerts.length - 1 ? '1px solid #fed7d7' : 'none', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#718096', paddingRight: '25px' }}>
                                                    <span>{alert.route}</span>
                                                    <span>{alert.timestamp}</span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#2d3748', marginTop: '2px', fontWeight: '500', paddingRight: '25px' }}>
                                                    {alert.message}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteAlert(alert.id)}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '0',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#feb2b2',
                                                        cursor: 'pointer',
                                                        padding: '5px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'color 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#e53e3e'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#feb2b2'}
                                                    title="Delete alert"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                                {alert.url && (
                                                    <a
                                                        href={alert.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            marginTop: '5px',
                                                            color: '#3182ce',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        Book Tickets Now <span>↗</span>
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <BookingInsights
                                intelligence={result?.intelligence}
                                inputs={inputs}
                                resultLevel={result?.level}
                            />

                            <InsightCard factors={result?.factors} resultLevel={result?.level} />
                            <ForecastChart data={result?.forecast} />

                            <TechnicalDetails result={result} />
                        </main>
                    </div>
                    <Footer />
                </div>
            )}
            {user && (
                <GeminiChat
                    externalMessage={geminiTrigger}
                    onOpen={() => setGeminiTrigger(null)}
                />
            )}
        </>
    );
}

export default App;
