import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './RequestsPage.css';

const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const BACKEND_URL = `http://${backendHost}:5000`;

export default function RequestsPage() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser) return;

        console.log("RequestsPage: Initializing Real-Time Sync...");
        let isMounted = true;
        let mockPollInterval;

        const reqsRef = collection(db, 'users', currentUser.uid, 'requests');
        const q = query(reqsRef, orderBy('createdAt', 'desc'));

        let currentLiveDocs = [];

        const fetchMockRequests = async () => {
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch(`${BACKEND_URL}/api/requests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (!isMounted) return;

                if (data.success && data.requests) {
                    const liveIds = new Set(currentLiveDocs.map(d => d.id));
                    const merged = [...currentLiveDocs];

                    data.requests.forEach(mockReq => {
                        if (!liveIds.has(mockReq.id)) {
                            merged.push(mockReq);
                        }
                    });

                    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setRequests(merged);
                }
            } catch (err) {
                console.warn("Could not fetch mock requests:", err);
            }
        };

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isMounted) return;
            currentLiveDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(currentLiveDocs);
            setLoading(false);

            // Fetch immediately after snapshot 
            fetchMockRequests();
        }, (err) => {
            console.error("Firestore Error:", err);
            setError("Unable to sync requests from Firestore. Trying backend API...");
            setLoading(false);
            fetchMockRequests();
        });

        // Poll every 3 seconds for mock requests submitted via QR phone scanning
        mockPollInterval = setInterval(fetchMockRequests, 3000);

        return () => {
            isMounted = false;
            unsubscribe();
            clearInterval(mockPollInterval);
        };
    }, [currentUser]);

    if (loading) {
        return (
            <div className="loading-overlay">
                <div>
                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                    <p className="text-secondary text-center">Loading incoming requests...</p>
                </div>
            </div>
        );
    }

    const pendingCount = requests.filter(r => r.status === 'Pending').length;

    return (
        <div className="requests-page">
            <div className="container">
                <div className="page-header animate-fadeInUp">
                    <div>
                        <h1>Verification Requests</h1>
                        <p className="text-secondary">Entities requesting to verify your credentials. The AI Guardian has assessed each for risk.</p>
                    </div>
                    <div className="badge badge-verified">{pendingCount} Pending</div>
                </div>

                {error && <div className="alert alert-error animate-fadeIn">{error}</div>}

                <div className="requests-list animate-fadeInUp delay-100">
                    {requests.length === 0 ? (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">📩</div>
                            <h3>No requests yet</h3>
                            <p className="text-secondary">When an entity scans your QR code or requests verification, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="requests-grid">
                            {requests.map((req, i) => (
                                <Link
                                    key={req.id}
                                    to={`/requests/${req.id}`}
                                    className={`request-card glass-card animate-fadeInUp delay-${(i % 5 + 1) * 100}`}
                                >
                                    <div className="req-header">
                                        <div className="verifier-info">
                                            <div className="verifier-logo">
                                                {req.verifierLogo ? <img src={req.verifierLogo} alt={req.verifier} /> : <span>🏢</span>}
                                            </div>
                                            <div>
                                                <h3>{req.verifier}</h3>
                                                <p className="text-xs text-muted">{new Date(req.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${req.status === 'Pending' ? 'badge-medium' : req.status === 'Approved' ? 'badge-low' : 'badge-high'}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="req-body">
                                        <div className="text-xs text-muted mb-4">REQUESTED DOCUMENTS:</div>
                                        <div className="req-docs">
                                            {req.requestedDocs.map(doc => (
                                                <div key={doc.id} className="req-doc-pill">📄 {doc.name}</div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="req-footer">
                                        <div className="ai-insight">
                                            <span className="ai-icon">🤖</span>
                                            <span className="text-sm">
                                                Risk: <strong style={{ color: req.riskAssessment?.riskLevel === 'High' ? 'var(--red-danger)' : 'var(--green-success)' }}>
                                                    {req.riskAssessment?.riskLevel || 'Checking...'}
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="view-link">Review Decision →</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
