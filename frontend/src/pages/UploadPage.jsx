import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './UploadPage.css';

const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const BACKEND_URL = `http://${backendHost}:5000`;

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function UploadPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('File too large. Max 10MB allowed.');
            return;
        }
        setFile(selectedFile);
        setError('');
        setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        handleFileSelect(droppedFile);
    };

    async function handleUpload() {
        if (!file) return;
        const formData = new FormData();
        formData.append('document', file);

        const uid = currentUser?.uid;
        if (!uid) {
            setError('You must be logged in to upload documents.');
            return;
        }
        formData.append('userId', uid);

        try {
            setError('');
            setLoading(true);
            setProgress(0);

            const token = await currentUser?.getIdToken();

            const res = await axios.post(`${BACKEND_URL}/api/documents/analyze`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (e) => {
                    setProgress(Math.round((e.loaded * 100) / (e.total || 1)));
                },
            });

            const { credential } = res.data;
            setResult(credential);

            // Also persist to local for quick dashboard updates if Firestore is Slow
            const currentStored = JSON.parse(localStorage.getItem('trustora_credentials') || '[]');
            localStorage.setItem('trustora_credentials', JSON.stringify([credential, ...currentStored]));

        } catch (err) {
            console.error(err);
            if (err.code === 'ERR_NETWORK') {
                setError('Cannot connect to backend. Make sure the server is running on port 5000.');
            } else {
                setError(err.response?.data?.error || 'Upload failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    const scoreColor = (s) => s >= 90 ? 'var(--green-success)' : s >= 75 ? 'var(--yellow-warning)' : 'var(--red-danger)';
    const riskBadge = (r) => r === 'Low' ? 'badge-low' : r === 'Medium' ? 'badge-medium' : 'badge-high';

    return (
        <div className="upload-page">
            <div className="container">
                <div className="upload-header animate-fadeInUp">
                    <h1>Upload Credential</h1>
                    <p className="text-secondary">Your document will be analyzed by the AI Guardian and secured with a cryptographic fingerprint.</p>
                </div>

                <div className="upload-layout">
                    <div className="animate-fadeInUp delay-100">
                        <div
                            className={`drop-zone glass-card ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !file && fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.rtf"
                                style={{ display: 'none' }}
                                id="file-input"
                                onChange={(e) => handleFileSelect(e.target.files[0])}
                            />

                            {!file ? (
                                <div className="drop-inner">
                                    <div className="drop-icon">📄</div>
                                    <h3>Drop your document here</h3>
                                    <p className="text-secondary">or click to browse</p>
                                    <div className="drop-types">PDF · IMG · DOC · XLS · PPT · Max 10 MB</div>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-preview-icon">
                                        {file.type.includes('pdf') ? '📑' : file.type.includes('image') ? '🖼️' : '📝'}
                                    </div>
                                    <div className="file-preview-info">
                                        <div className="file-preview-name">{file.name}</div>
                                        <div className="file-preview-size text-muted text-sm">{formatBytes(file.size)}</div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                                    >
                                        ✕ Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        {error && <div className="alert alert-error mt-16"><span>⚠️</span> {error}</div>}

                        {loading && (
                            <div className="upload-progress glass-card mt-16">
                                <div className="flex-between mb-8">
                                    <span className="text-sm font-medium">Uploading & Analyzing...</span>
                                    <span className="text-sm text-muted">{progress}%</span>
                                </div>
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${progress}%`, background: 'var(--gradient-hero)' }}
                                    />
                                </div>
                                <p className="text-xs text-muted mt-8">🤖 AI Guardian is analyzing your document...</p>
                            </div>
                        )}

                        <div className="upload-actions mt-16">
                            <button
                                className="btn btn-primary w-full btn-lg"
                                onClick={handleUpload}
                                disabled={!file || loading}
                            >
                                {loading
                                    ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</>
                                    : '🤖 Analyze & Secure Document'
                                }
                            </button>
                            {result && (
                                <button className="btn btn-secondary w-full mt-8" onClick={() => navigate('/dashboard')}>
                                    ← Back to Vault
                                </button>
                            )}
                        </div>
                    </div>

                    {result && (
                        <div className="result-panel animate-slideInRight">
                            <div className="glass-card result-card">
                                <div className="result-header">
                                    <h3>✅ Analysis Complete</h3>
                                    <span className={`badge ${riskBadge(result.aiAnalysis?.riskLevel || 'Low')}`}>
                                        {result.aiAnalysis?.riskLevel || 'Low'} Risk
                                    </span>
                                </div>

                                <div className="score-section">
                                    <div className="score-label">Authenticity Score</div>
                                    <div className="score-ring">
                                        <svg viewBox="0 0 80 80" className="ring-svg">
                                            <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
                                            <circle
                                                cx="40" cy="40" r="34"
                                                stroke={scoreColor(result.aiAnalysis?.authenticityScore || 0)}
                                                strokeWidth="8"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 34}`}
                                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - (result.aiAnalysis?.authenticityScore || 0) / 100)}`}
                                                transform="rotate(-90 40 40)"
                                                style={{ transition: 'stroke-dashoffset 1s ease' }}
                                            />
                                        </svg>
                                        <div className="score-center" style={{ color: scoreColor(result.aiAnalysis?.authenticityScore || 0) }}>
                                            {result.aiAnalysis?.authenticityScore || 0}%
                                        </div>
                                    </div>
                                </div>

                                <div className="result-details">
                                    <div className="detail-row">
                                        <span className="text-muted text-sm">Document Type</span>
                                        <span className="font-medium">{result.aiAnalysis?.documentType || 'Detected'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="text-muted text-sm">Issuer</span>
                                        <span className="font-medium">{result.aiAnalysis?.issuer || result.aiAnalysis?.visualIssuer || 'Verified'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="text-muted text-sm">Integrity Hash</span>
                                        <span className="hash-value">{result.integrityHash?.slice(0, 16)}...</span>
                                    </div>
                                    {result.forensicData?.device && (
                                        <div className="detail-row">
                                            <span className="text-muted text-sm">Forensic Pulse</span>
                                            <span className="text-xs">{result.forensicData.device}</span>
                                        </div>
                                    )}
                                </div>

                                {result.aiAnalysis?.extractedSkills?.length > 0 && (
                                    <div className="skills-section">
                                        <div className="text-muted text-sm mb-8">Detected Skills</div>
                                        <div className="skills-wrap">
                                            {result.aiAnalysis.extractedSkills.map((s) => (
                                                <span key={s} className="skill-chip">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="alert alert-info mt-16">
                                    <span>🤖</span>
                                    <span>{result.aiAnalysis?.recommendation || 'Document analysis complete.'}</span>
                                </div>

                                {result.aiAnalysis?.recoveryAction && result.aiAnalysis.recoveryAction.status !== "Recovery Unavailable" && (
                                    <div className="alert alert-warning mt-16 recovery-alert">
                                        <div className="recovery-header">
                                            <span>🪄</span>
                                            <strong>Smart Recovery Agent: {result.aiAnalysis.recoveryAction.issue}</strong>
                                        </div>
                                        <p className="recovery-suggestion mt-8 text-sm">
                                            {result.aiAnalysis.recoveryAction.suggestions}
                                        </p>
                                    </div>
                                )}

                                <div className="alert alert-success mt-16">
                                    <span>💾</span>
                                    <span>Credential secured in your vault!</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
