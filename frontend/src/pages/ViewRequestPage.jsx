import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const BACKEND_URL = `http://${backendHost}:5000`;

export default function ViewRequestPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deciding, setDeciding] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser || !id) return;

        console.log(`ViewRequest: Listening to request ${id}`);

        const docRef = doc(db, 'users', currentUser.uid, 'requests', id);

        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                setRequest({ id: docSnap.id, ...docSnap.data() });
                setLoading(false);
            } else {
                // Fallback to backend API for mock requests
                try {
                    const token = await currentUser.getIdToken();
                    const res = await fetch(`${BACKEND_URL}/api/requests/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success && data.request) {
                        setRequest(data.request);
                        setError('');
                    } else {
                        setError('Request not found in your vault.');
                    }
                } catch (err) {
                    console.error("Mock Request Fetch Error:", err);
                    setError('Request not found in your vault.');
                }
                setLoading(false);
            }
        }, (err) => {
            console.error("Firestore Error:", err);
            setError("Unable to sync request details.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, currentUser]);

    async function handleDecision(decision) {
        try {
            setDeciding(true);
            const token = await currentUser?.getIdToken();
            const res = await fetch(`${BACKEND_URL}/api/requests/${id}/decide`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ decision })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Decision failed');

            setMessage({ type: decision === 'Approve' ? 'success' : 'info', text: data.message });

            // Update local state
            setRequest(prev => ({ ...prev, status: data.status, accessGrant: data.accessGrant }));
        } catch (err) {
            setError(err.message || 'Failed to process decision.');
        } finally {
            setDeciding(false);
        }
    }

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="text-center">
                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                    <p className="text-secondary">AI Guardian is analyzing the request context...</p>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="container py-xl text-center">
                <div className="alert alert-error inline-block">{error || 'Request not found'}</div>
                <div className="mt-24">
                    <Link to="/requests" className="btn btn-secondary">← Back to Requests</Link>
                </div>
            </div>
        );
    }

    const { riskAssessment, consentAdvice } = request;

    return (
        <div className="view-request-page">
            <div className="container">
                <div className="view-header animate-fadeInUp">
                    <Link to="/requests" className="back-link">← Back to Inbox</Link>
                    <div className="flex-between mt-16">
                        <h1>Request from {request.verifier}</h1>
                        <span className={`badge ${request.status === 'Pending' ? 'badge-medium' : request.status === 'Approved' ? 'badge-low' : 'badge-high'}`}>
                            {request.status}
                        </span>
                    </div>
                </div>

                {message && (
                    <div className={`alert alert-${message.type} animate-fadeIn mt-16`}>
                        <span>{message.type === 'success' ? '✅' : 'ℹ️'}</span>
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="view-grid">
                    {/* Left Column: Request Details */}
                    <div className="animate-fadeInUp delay-100">
                        <div className="glass-card detail-card">
                            <div className="verifier-profile">
                                <div className="large-logo">
                                    {request.verifierLogo ? <img src={request.verifierLogo} alt={request.verifier} /> : '🏢'}
                                </div>
                                <h2>{request.verifier}</h2>
                                <p className="text-muted text-sm">Requested on {new Date(request.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="requested-docs-list">
                                <h3>Requested Documents</h3>
                                {request.requestedDocs.map(doc => (
                                    <div key={doc.id} className="requested-doc-item glass-card">
                                        <div className="doc-icon">📄</div>
                                        <div className="doc-info">
                                            <div className="doc-name">{doc.name}</div>
                                            <div className="doc-type text-xs text-muted">{doc.type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Guardian Insight */}
                    <div className="animate-fadeInUp delay-200">
                        <div className="guardian-room glass-card">
                            <div className="guardian-header">
                                <div className="ai-status">
                                    <div className="ai-avatar">🤖</div>
                                    <div>
                                        <h3>AI Guardian Room</h3>
                                        <p className="text-xs text-muted">Intelligent Access Evaluation</p>
                                    </div>
                                </div>
                                <div className={`risk-pill ${riskAssessment?.riskLevel}`}>
                                    {riskAssessment?.riskLevel} Risk
                                </div>
                            </div>

                            <div className="agent-insights">
                                {/* Risk Agent Insight */}
                                <div className="insight-block">
                                    <div className="insight-header">
                                        <span className="insight-label">🔍 Risk Assessment Agent</span>
                                        <span className="insight-score">Score: {riskAssessment?.riskScore}/100</span>
                                    </div>
                                    <div className="insight-content">
                                        {riskAssessment?.riskFactors.length > 0 ? (
                                            <ul className="risk-factors">
                                                {riskAssessment.riskFactors.map((f, i) => <li key={i}>{f}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="text-sm">No significant risk factors detected in this request.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Consent Agent Insight */}
                                <div className="insight-block highlight">
                                    <div className="insight-header">
                                        <span className="insight-label">🤝 Consent Advisor Agent</span>
                                    </div>
                                    <div className="insight-content">
                                        <div className="recommendation-badge">
                                            {consentAdvice?.recommendation}
                                        </div>
                                        <p className="text-sm mt-8">{consentAdvice?.reasoning}</p>
                                    </div>
                                </div>
                            </div>

                            {request.status === 'Pending' ? (
                                <div className="decision-actions mt-24">
                                    <button
                                        className="btn btn-primary w-full btn-lg"
                                        onClick={() => handleDecision('Approve')}
                                        disabled={deciding}
                                    >
                                        {deciding ? 'Processing...' : '✅ Approve & Grant Access'}
                                    </button>
                                    <button
                                        className="btn btn-danger w-full mt-8"
                                        onClick={() => handleDecision('Reject')}
                                        disabled={deciding}
                                    >
                                        Reject Request
                                    </button>
                                    <p className="text-xs text-muted text-center mt-12">
                                        Approve will grant time-limited (1 hour) access to these documents only.
                                    </p>
                                </div>
                            ) : (
                                <div className="decided-info mt-24">
                                    <div className="alert alert-info">
                                        {request.status === 'Approved' ? (
                                            <div>
                                                <strong>Access Active</strong>
                                                <p className="text-xs mt-4">A secure token has been shared with {request.verifier}.</p>
                                                <div className="token-display mt-8">
                                                    token: {request.accessGrant?.accessToken.slice(0, 16)}...
                                                </div>
                                            </div>
                                        ) : (
                                            <div>Request Rejected</div>
                                        )}
                                    </div>
                                    <Link to="/requests" className="btn btn-secondary w-full mt-16">Back to Inbox</Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
