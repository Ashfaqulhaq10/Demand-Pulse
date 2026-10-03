import { useState } from 'react';
import { FaUser, FaLock, FaUserPlus, FaArrowRight } from 'react-icons/fa';

const Login = ({ onAuth }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: ''
    });
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = isLogin ? '/login' : '/register';
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                if (isLogin) {
                    onAuth(data.user);
                } else {
                    alert(data.message);
                    setIsLogin(true);
                }
            } else {
                alert(data.detail || "Authentication failed");
            }
        } catch (error) {
            console.error("Auth error:", error);
            alert("Connection to authentication server failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="login-video-bg"
            >
                <source src="/14505255_2160_3840_30fps.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="auth-card-container">
                <div className="auth-card glass floating-anim">
                    <div className="auth-header">
                        <div className="auth-logo-container">
                            <div className="auth-logo">DP</div>
                            <div className="logo-glow"></div>
                        </div>
                        <h2>{isLogin ? 'Welcome Back' : 'Join DemandPulse'}</h2>
                        <p>{isLogin ? 'Login to track your travel routes' : 'Create an account for full access'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {!isLogin && (
                            <div className="input-group stagger-1">
                                <label><FaUserPlus /> Full Name</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                    <div className="input-focus-bg"></div>
                                </div>
                            </div>
                        )}

                        <div className="input-group stagger-2">
                            <label><FaUser /> Username</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    placeholder="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                                <div className="input-focus-bg"></div>
                            </div>
                        </div>

                        <div className="input-group stagger-3">
                            <label><FaLock /> Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <div className="input-focus-bg"></div>
                            </div>
                        </div>

                        <button type="submit" className="auth-btn premium-btn hover-glow" disabled={loading}>
                            <span>{loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}</span>
                            <FaArrowRight className="btn-icon" />
                        </button>
                    </form>

                    <div className="auth-toggle">
                        <p>{isLogin ? "Don't have an account?" : "Already have an account?"}</p>
                        <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn-premium">
                            {isLogin ? 'Create Account' : 'Back to Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
