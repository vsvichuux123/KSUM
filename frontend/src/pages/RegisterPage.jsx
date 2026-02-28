import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

function getPasswordStrength(password) {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score: 1, label: 'Weak', color: 'weak' };
    if (score <= 2) return { score: 2, label: 'Medium', color: 'medium' };
    return { score: 3, label: 'Strong', color: 'strong' };
}

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirm, setConfirm] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const strength = getPasswordStrength(password);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name || !email || !password || !confirm) {
            setError('Please fill in all fields.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        try {
            setError('');
            setLoading(true);
            await register(email, password, name);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            const msgs = {
                'auth/email-already-in-use': 'An account with this email already exists.',
                'auth/invalid-email': 'Invalid email address.',
                'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
                'auth/network-request-failed': 'Network error. Please check your connection.',
            };
            setError(msgs[err.code] || `Registration failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card glass-card animate-fadeInUp">
                <div className="auth-header">
                    <div className="auth-logo">🛡️</div>
                    <h1>Create Your Vault</h1>
                    <p className="text-secondary">Join Trustora — it's 100% free</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-name">Full Name</label>
                        <input
                            id="reg-name"
                            type="text"
                            className="form-input"
                            placeholder="Varsha Kumar"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email address</label>
                        <input
                            id="reg-email"
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
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="reg-password"
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
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
                        {password && (
                            <div className="password-strength">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`strength-bar ${strength.score >= i ? `active-${strength.color}` : ''}`}
                                    />
                                ))}
                                <span
                                    className="strength-label"
                                    style={{
                                        color: strength.color === 'weak' ? 'var(--red-danger)' :
                                            strength.color === 'medium' ? 'var(--yellow-warning)' : 'var(--green-success)'
                                    }}
                                >
                                    {strength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input
                                id="reg-confirm"
                                type={showConfirm ? "text" : "password"}
                                className="form-input"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirm(!showConfirm)}
                                aria-label={showConfirm ? "Hide password" : "Show password"}
                            >
                                {showConfirm ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full btn-lg"
                        disabled={loading}
                        id="register-submit-btn"
                    >
                        {loading ? (
                            <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating vault...</>
                        ) : (
                            '🚀 Create My Vault'
                        )}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>Already have an account?</span>
                </div>

                <Link to="/login" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                    Sign in →
                </Link>
            </div>
        </div>
    );
}
