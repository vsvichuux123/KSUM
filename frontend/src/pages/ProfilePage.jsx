import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ProfilePage.css';

const BACKEND_URL = `http://${window.location.hostname}:5000`;

export default function ProfilePage() {
    const { currentUser } = useAuth();
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const stored = JSON.parse(localStorage.getItem('trustora_credentials') || '[]');
    const totalDocs = stored.length;

    const initials = currentUser?.displayName
        ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : currentUser?.email?.charAt(0).toUpperCase() || '?';

    const [trustData, setTrustData] = useState(null);
    const [requests, setRequests] = useState([]);

    async function fetchData() {
        try {
            setLoading(true);
            setError('');
            const uid = currentUser?.uid;
            if (!uid) throw new Error('User not logged in');

            console.log("AI Guardian: Syncing profile data for UID:", uid);

            const token = await currentUser?.getIdToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            // Parallel fetches using native fetch for consistency with Dashboard
            const verificationUrl = `${window.location.origin}/v/${uid}`;
            const ts = Date.now();
            const responses = await Promise.all([
                fetch(`${BACKEND_URL}/api/qr/${uid}?url=${encodeURIComponent(verificationUrl)}&t=${ts}`, { headers }),
                fetch(`${BACKEND_URL}/api/trust/score`, { headers }),
                fetch(`${BACKEND_URL}/api/requests`, { headers })
            ]);

            // Check if any request failed
            for (const res of responses) {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server responded with ${res.status}: ${res.statusText}`);
                }
            }

            const [qrData, trustData, requestsData] = await Promise.all(responses.map(res => res.json()));

            setQrData(qrData);
            setTrustData(trustData.trustData);
            setRequests(requestsData.requests);

            console.log("AI Guardian: Profile sync complete.");
        } catch (err) {
            console.error("AI Guardian Sync Error:", err);
            setError(err.message || 'Failed to sync profile data with AI Guardian.');
        } finally {
            setLoading(false);
        }
    }

    // Alias for the button click
    const generateQR = fetchData;

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="profile-page">
            <div className="container">
                <div className="profile-header animate-fadeInUp">
                    <h1>Your Profile</h1>
                    <p className="text-secondary">Your digital identity and Trustora public verification QR code.</p>
                </div>

                <div className="profile-layout">
                    {/* Identity Card */}
                    <div className="animate-fadeInUp delay-100">
                        <div className="identity-card glass-card">
                            <div className="id-card-header">
                                <div className="id-avatar">{initials}</div>
                                <div className="id-badge">
                                    <span>🛡️</span> Trustora Verified
                                </div>
                            </div>

                            <h2 className="id-name">{currentUser?.displayName || 'Anonymous User'}</h2>
                            <p className="id-email text-secondary">{currentUser?.email}</p>

                            <div className="id-stats">
                                <div className="id-stat">
                                    <div className="id-stat-val">{totalDocs}</div>
                                    <div className="id-stat-lbl">Credentials</div>
                                </div>
                                <div className="id-stat-divider" />
                                <div className="id-stat">
                                    <div className="id-stat-val">🔐</div>
                                    <div className="id-stat-lbl">Secured</div>
                                </div>
                                <div className="id-stat-divider" />
                                <div className="id-stat">
                                    <div className="id-stat-val">✅</div>
                                    <div className="id-stat-lbl">Verified</div>
                                </div>
                            </div>

                            <div className="id-uid">
                                <span className="text-muted text-xs">UID:</span>
                                <span className="uid-value">{currentUser?.uid ? `${currentUser.uid.slice(0, 16)}...` : 'Not Available'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Code Card */}
                <div className="animate-fadeInUp delay-200">
                    <div className="qr-card glass-card">
                        <div className="qr-card-header">
                            <h3>📷 Identity QR Code</h3>
                            <p className="text-secondary text-sm">Share this QR code with verifiers to give them access to your credentials.</p>
                        </div>

                        {error && (
                            <div className="alert alert-error mt-16">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="qr-display">
                            {loading ? (
                                <div className="qr-loading">
                                    <div className="spinner" style={{ width: 36, height: 36 }} />
                                    <p className="text-secondary text-sm mt-16">Generating your QR code...</p>
                                </div>
                            ) : qrData ? (
                                <>
                                    <div className="qr-frame">
                                        <img
                                            src={qrData.qrDataUrl}
                                            alt="Trustora Identity QR Code"
                                            className="qr-image"
                                        />
                                    </div>
                                    {window.location.hostname === 'localhost' && (
                                        <div className="network-tip text-xs mt-12 p-8 glass-card" style={{ color: 'var(--purple-light)', textAlign: 'center', border: '1px dashed var(--purple-main)' }}>
                                            🌐 <b>Mobile Scan Ready:</b> To open this on your phone, access Trustora via your IP address (check your computer's terminal for the link).
                                        </div>
                                    )}
                                    <div className="qr-url">
                                        <span className="text-muted text-xs">Verification URL:</span>
                                        <span className="url-text">{qrData.verificationUrl}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="qr-placeholder">
                                    <div className="placeholder-icon">📷</div>
                                    <p className="text-secondary">QR code not generated yet</p>
                                </div>
                            )}
                        </div>

                        <div className="qr-actions mt-24">
                            <button
                                className="btn btn-secondary w-full"
                                onClick={generateQR}
                                disabled={loading}
                            >
                                {loading ? 'Generating...' : '🔄 Regenerate QR Code'}
                            </button>
                            {qrData && (
                                <a
                                    href={qrData.qrDataUrl}
                                    download="trustora-qr.png"
                                    className="btn btn-outline w-full mt-8"
                                >
                                    ⬇️ Download QR Code
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Guardian Status */}
                <div className="animate-fadeInUp delay-300">
                    <div className="guardian-card glass-card">
                        <h3>🤖 AI Guardian Status</h3>
                        <div className="guardian-status active">
                            <div className="guardian-dot" />
                            <span>System Protected</span>
                        </div>
                        <div className="guardian-meta">
                            <div className="guardian-row">
                                <span className="text-muted text-sm">Protection Level</span>
                                <span className="badge badge-low">MAXIMUM (AES-256)</span>
                            </div>
                            <div className="guardian-row">
                                <span className="text-muted text-sm">Identity Trust Score</span>
                                <span className="badge badge-low" style={{ background: 'var(--purple-main)', color: '#fff' }}>
                                    {trustData?.trustScore || 0}%
                                </span>
                            </div>
                            <div className="guardian-row">
                                <span className="text-muted text-sm">Identity Grade</span>
                                <span className={`badge ${trustData?.trustLevel === 'Bronze' ? 'badge-high' : 'badge-low'}`}>
                                    {trustData?.trustLevel || 'Verifying...'}
                                </span>
                            </div>
                            <div className="guardian-row">
                                <span className="text-muted text-sm">Suspicious Activity</span>
                                <span style={{ color: 'var(--green-success)' }} className="text-sm">✅ None detected</span>
                            </div>
                            <div className="guardian-row">
                                <span className="text-muted text-sm">Pending Requests</span>
                                <span className="text-sm">
                                    {requests.filter(r => r.status === 'Pending').length} pending review
                                </span>
                            </div>
                        </div>

                        <div className="guardian-desc text-sm text-secondary mt-16">
                            The AI Guardian is continuously monitoring your vault for suspicious access patterns,
                            evaluating incoming verification requests, and protecting your digital identity.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
