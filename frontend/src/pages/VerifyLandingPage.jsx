import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './VerifyLandingPage.css';

const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const BACKEND_URL = `http://${backendHost}:5000`;

export default function VerifyLandingPage() {
    const { uid } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [requestedTypes, setRequestedTypes] = useState([]);
    const [success, setSuccess] = useState(false);
    const [verifierName, setVerifierName] = useState('');
    const [requestId, setRequestId] = useState(null);
    const [requestStatus, setRequestStatus] = useState(null);
    const [accessGrant, setAccessGrant] = useState(null);

    useEffect(() => {
        async function fetchPublicProfile() {
            try {
                setLoading(true);
                const res = await axios.get(`${BACKEND_URL}/api/public/profile/${uid}`, {
                    timeout: 5000 // 5 seconds timeout
                });
                setUser(res.data);
            } catch (err) {
                console.error(err);
                setError('Could not find this Trustora vault. It may be private or deleted.');
            } finally {
                setLoading(false);
            }
        }
        fetchPublicProfile();
    }, [uid]);

    const toggleType = (type) => {
        setRequestedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    async function handleRequestAccess() {
        if (!verifierName) {
            alert('Please enter your organization name.');
            return;
        }
        if (requestedTypes.length === 0) {
            alert('Please select at least one document type to verify.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await axios.post(`${BACKEND_URL}/api/public/request/create`, {
                targetUid: uid,
                verifierName: verifierName,
                requestedDocTypes: requestedTypes
            });
            setSuccess(true);
            setRequestId(res.data.requestId);
            setRequestStatus('Pending');
        } catch (err) {
            console.error(err);
            setError('Failed to send request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // Poll for status once request is successfully created
    useEffect(() => {
        let interval;
        if (success && requestId && requestStatus === 'Pending') {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`${BACKEND_URL}/api/public/request/status/${uid}/${requestId}`);
                    if (res.data.success) {
                        setRequestStatus(res.data.status);
                        if (res.data.status === 'Approved') {
                            setAccessGrant(res.data.accessGrant);
                            clearInterval(interval);
                        } else if (res.data.status === 'Rejected') {
                            clearInterval(interval);
                        }
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [success, requestId, requestStatus, uid]);

    if (loading) return (
        <div className="verify-landing flex-center">
            <div className="text-center">
                <div className="spinner mb-16" style={{ width: 48, height: 48 }}></div>
                <p className="text-secondary">Connecting to Trustora Node...</p>
            </div>
        </div>
    );

    if (error && !success) return (
        <div className="verify-landing flex-center">
            <div className="glass-card p-xl text-center" style={{ maxWidth: 400 }}>
                <div className="error-icon" style={{ fontSize: '3rem', marginBottom: 20 }}>🛡️⚠️</div>
                <h2 className="mb-8">Access Denied</h2>
                <p className="text-secondary mb-24">{error}</p>
                <Link to="/" className="btn btn-secondary w-full">Back to Home</Link>
            </div>
        </div>
    );

    if (success) return (
        <div className="verify-landing flex-center">
            <div className="glass-card p-xl text-center animate-fadeInUp" style={{ maxWidth: 500 }}>
                {requestStatus === 'Pending' && (
                    <>
                        <div className="spinner mb-16" style={{ width: 64, height: 64, margin: '0 auto 24px' }}></div>
                        <h2 className="mb-12">Waiting for Approval</h2>
                        <p className="text-secondary mb-24">
                            Your request to verify <strong>{user?.name}</strong> has been delivered to their vault.
                        </p>
                        <p className="text-sm text-muted mb-24">
                            Please wait while they review your request on their trusted device. This screen will automatically update.
                        </p>
                    </>
                )}
                {requestStatus === 'Approved' && (
                    <div className="animate-fadeIn">
                        <div className="success-icon" style={{ fontSize: '4rem', marginBottom: 20 }}>✅</div>
                        <h2 className="mb-12">Access Granted</h2>
                        <p className="text-secondary mb-16">
                            <strong>{user?.name}</strong> has approved your verification request.
                        </p>
                        <div className="alert alert-success text-left mb-24">
                            <strong>Secure Verification Token:</strong>
                            <div className="mt-8 p-8" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 4, wordBreak: 'break-all' }}>
                                <code>{accessGrant?.accessToken || 'Token generated automatically'}</code>
                            </div>
                            <p className="text-xs mt-8">This token grants temporary view access to the requested documents.</p>
                        </div>
                        <Link to="/" className="btn btn-primary w-full">Done</Link>
                    </div>
                )}
                {requestStatus === 'Rejected' && (
                    <div className="animate-fadeIn">
                        <div className="error-icon" style={{ fontSize: '4rem', marginBottom: 20 }}>❌</div>
                        <h2 className="mb-12">Request Denied</h2>
                        <p className="text-secondary mb-24">
                            The user has declined to share these credentials with your organization at this time.
                        </p>
                        <button onClick={() => { setSuccess(false); setRequestStatus(null); }} className="btn btn-secondary w-full">Return</button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="verify-landing">
            <div className="container py-xl">
                <div className="public-profile-header text-center animate-fadeInUp">
                    <div className="public-avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <h1>{user.name}</h1>
                    <div className="public-badge">
                        <span>🛡️</span> Trustora Verified Vault
                    </div>
                    <p className="text-secondary mt-16 max-w-md mx-auto">
                        This user holds a cryptographically secured identity vault on Trustora.
                        You can request specific credentials for verification below.
                    </p>
                </div>

                <div className="verify-form glass-card mt-32 animate-fadeInUp delay-100">
                    <div className="form-section">
                        <label className="form-label">Verifier Information</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter Company or Organization Name"
                            value={verifierName}
                            onChange={(e) => setVerifierName(e.target.value)}
                        />
                        <p className="text-xs text-muted mt-8">This will be shown to the user in their vault requests.</p>
                    </div>

                    <div className="form-section mt-24">
                        <label className="form-label">Select Credentials to Verify</label>
                        <div className="type-selector">
                            {user.availableDocumentTypes.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`type-chip ${requestedTypes.includes(type) ? 'active' : ''}`}
                                    onClick={() => toggleType(type)}
                                >
                                    {requestedTypes.includes(type) ? '✅' : '📄'} {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="verify-actions mt-32">
                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={handleRequestAccess}
                            disabled={submitting}
                        >
                            {submitting ? 'Sending Request...' : '📩 Request Secure Access'}
                        </button>
                        <div className="security-note mt-16">
                            <span>🔒</span>
                            <span className="text-xs text-muted">
                                Trustora uses Zero-Knowledge concepts. Users never share documents directly;
                                they grant temporary access to cryptographically verified proofs.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
