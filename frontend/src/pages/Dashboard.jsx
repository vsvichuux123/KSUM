import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CredentialCard from '../components/CredentialCard';
import RiskPanel from '../components/RiskPanel';
import VaultAssistant from '../components/VaultAssistant';
import './Dashboard.css';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// DEMO_CREDENTIALS removed for real-world usage.

export default function Dashboard() {
    const { currentUser } = useAuth();
    const [credentials, setCredentials] = useState([]);
    const [trustData, setTrustData] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        console.log("Dashboard: Initializing Real-Time Sync...");

        const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
        const BACKEND_URL = `http://${backendHost}:5000`;
        // 1. Listen for Credentials in Firestore
        const credsRef = collection(db, 'users', currentUser.uid, 'credentials');
        const qCreds = query(credsRef, orderBy('uploadedAt', 'desc'));

        const unsubscribeCreds = onSnapshot(qCreds, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCredentials(docs);
            setLoading(false);
        }, (err) => {
            console.error("Firestore Creds Error:", err);
            // Fallback to local storage if Firestore fails
            const stored = JSON.parse(localStorage.getItem('trustora_credentials') || '[]');
            setCredentials(stored);
            setLoading(false);
        });

        // 2. Listen for Requests in Firestore
        const reqsRef = collection(db, 'users', currentUser.uid, 'requests');
        const qReqs = query(reqsRef, orderBy('createdAt', 'desc'));

        const unsubscribeReqs = onSnapshot(qReqs, (snapshot) => {
            const reqDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqDocs);
        });

        // 3. Fetch Trust Score (Backend Agent)
        async function fetchTrust() {
            try {
                const token = await currentUser?.getIdToken();
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const res = await fetch('http://127.0.0.1:5000/api/trust/score', { headers });
                const tData = await res.json();
                setTrustData(tData.trustData);
            } catch (err) {
                console.error('Trust Score Fetch failed:', err);
            }
        }
        fetchTrust();

        return () => {
            unsubscribeCreds();
            unsubscribeReqs();
        };
    }, [currentUser]);

    async function simulateIncomingRequest() {
        try {
            setSimulating(true);
            const token = await currentUser?.getIdToken();
            const res = await fetch('http://127.0.0.1:5000/api/requests/simulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    verifier: 'Meta Corp',
                    docs: credentials.length > 0 ? [credentials[0]] : []
                })
            });
            const data = await res.json();
            setRequests(prev => [data.request, ...prev]);
            alert('🚨 Simulating Incoming Request! Check your Requests inbox.');
        } catch (err) {
            console.error('Simulation failed:', err);
        } finally {
            setSimulating(false);
        }
    }

    const pendingRequests = requests.filter(r => r.status === 'Pending').length;
    const firstName = currentUser?.displayName?.split(' ')[0] || 'User';

    if (loading) {
        return (
            <div className="loading-overlay">
                <div>
                    <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                    <p className="text-secondary text-center">Loading your vault...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="container">
                {/* Header */}
                <div className="dash-header animate-fadeInUp">
                    <div>
                        <h1>Welcome back, <span className="gradient-text">{firstName}</span> 👋</h1>
                        <p className="text-secondary">Your {trustData?.trustLevel || 'Bronze'} level vault is active and protected by the AI Guardian.</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary mr-12"
                            onClick={simulateIncomingRequest}
                            disabled={simulating}
                        >
                            {simulating ? 'Processing...' : '🧪 Simulate Request'}
                        </button>
                        <Link to="/upload" className="btn btn-primary">
                            📤 Upload Document
                        </Link>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="stats-grid animate-fadeInUp delay-100">
                    <div className="stat-card glass-card">
                        <div className="stat-icon">📁</div>
                        <div className="stat-value">{credentials.length}</div>
                        <div className="stat-label">Total Credentials</div>
                    </div>
                    <div className="stat-card glass-card highlight">
                        <div className="stat-icon">📩</div>
                        <div className="stat-value">{pendingRequests}</div>
                        <div className="stat-label">Pending Requests</div>
                        {pendingRequests > 0 && <span className="pulse-dot"></span>}
                        <Link to="/requests" className="card-link-overlay"></Link>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-value">{trustData?.trustScore || 0}%</div>
                        <div className="stat-label">Identity Trust Score</div>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon">🎖️</div>
                        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{trustData?.trustLevel || 'Basic'}</div>
                        <div className="stat-label">Identity Level</div>
                    </div>
                </div>

                {/* AI Guardian Panel */}
                <div className="animate-fadeInUp delay-200">
                    <RiskPanel credentials={credentials} />
                </div>

                {/* Credentials */}
                <div className="creds-section animate-fadeInUp delay-300">
                    <div className="flex-between mb-section-head">
                        <h2>Your Credentials</h2>
                        <span className="text-muted text-sm">{credentials.length} document{credentials.length !== 1 ? 's' : ''}</span>
                    </div>

                    {credentials.length === 0 ? (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">📂</div>
                            <h3>Your vault is empty</h3>
                            <p className="text-secondary">Upload your first credential to get started.</p>
                            <Link to="/upload" className="btn btn-primary mt-24">📤 Upload Document</Link>
                        </div>
                    ) : (
                        <div className="creds-grid">
                            {credentials.map((cred, i) => (
                                <div key={cred.id} className={`delay-${(i % 4 + 1) * 100} animate-fadeInUp`}>
                                    <CredentialCard credential={cred} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Intelligent AI Assistant Widget */}
            <VaultAssistant credentials={credentials} />
        </div>
    );
}
