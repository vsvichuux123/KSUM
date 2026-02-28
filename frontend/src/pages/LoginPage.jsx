import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }
        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            const msgs = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/invalid-email': 'Invalid email address.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/network-request-failed': 'Network error. Please check your connection.',
            };
            setError(msgs[err.code] || `Login failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card glass-card animate-fadeInUp">
                <div className="auth-header">
                    <div className="auth-logo">🛡️</div>
                    <h1>Welcome back</h1>
                    <p className="text-secondary">Sign in to your Trustora vault</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full btn-lg"
                        disabled={loading}
                        id="login-submit-btn"
                    >
                        {loading ? (
                            <><span className="spinner" style={{ width: 18, height: 18 }}></span> Signing in...</>
                        ) : (
                            '🔓 Sign In to Vault'
                        )}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>Don't have an account?</span>
                </div>

                <Link to="/register" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                    Create a free account →
                </Link>
            </div>
        </div>
    );
}
