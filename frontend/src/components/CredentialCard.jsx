import React, { useState } from 'react';
import './CredentialCard.css';

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

export default function CredentialCard({ credential }) {
    const { originalName, uploadedAt, integrityHash, tampered, aiAnalysis } = credential;
    const [expanded, setExpanded] = useState(false);

    const score = aiAnalysis?.confidenceScore || aiAnalysis?.authenticityScore || credential.authenticityScore || 0;
    const risk = aiAnalysis?.status || aiAnalysis?.riskLevel || credential.riskLevel || 'Unknown';
    const forensic = aiAnalysis?.forensicData || {};
    const verifiedBy = credential.verifiedBy || aiAnalysis?.verifiedBy || '';

    const isBlockchainVerified = verifiedBy.includes('Blockchain') || verifiedBy.includes('Smart Contract');

    const riskClass = isBlockchainVerified ? 'badge-low' : (risk === 'Authentic' || risk === 'Low' ? 'badge-low' : (risk === 'Suspicious' || risk === 'Medium' ? 'badge-medium' : 'badge-high'));
    const scoreColor = isBlockchainVerified ? 'var(--blue-primary)' : score >= 90 ? 'var(--green-success)' : score >= 75 ? 'var(--yellow-warning)' : 'var(--red-danger)';

    const fileIcon = originalName.endsWith('.pdf') ? '📑'
        : /\.(jpg|jpeg|png)$/i.test(originalName) ? '🖼️'
            : '📝';

    return (
        <div className={`cred-card glass-card ${expanded ? 'expanded' : ''}`}>
            <div className="cred-main" onClick={() => setExpanded(!expanded)}>
                <div className="cred-icon">{fileIcon}</div>
                <div className="cred-info">
                    <div className="cred-name">{originalName}</div>
                    <div className="cred-meta text-xs text-muted">
                        {aiAnalysis?.detectedType || credential.type} · {forensic.visualIssuer || credential.issuer || aiAnalysis?.issuer}
                    </div>
                    <div className="cred-date text-xs text-muted">{formatDate(uploadedAt)}</div>
                </div>
                <div className="cred-right">
                    <div className="cred-score-wrap">
                        {isBlockchainVerified ? (
                            <div className="cred-score" style={{ color: scoreColor, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>⛓️ On-Chain</div>
                        ) : (
                            <div className="cred-score" style={{ color: scoreColor }}>{score}%</div>
                        )}
                        {forensic.issuerMatch === 'Verified' && !isBlockchainVerified && (
                            <span className="consensus-chip" title="Semantic agreement between Visual AI and OCR">
                                Semantic Match
                            </span>
                        )}
                        {isBlockchainVerified && (
                            <span className="consensus-chip" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--blue-primary)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                Cryptographic Match
                            </span>
                        )}
                    </div>
                    {isBlockchainVerified ? (
                        <span className="badge" style={{ background: 'var(--blue-primary)', color: 'white' }}>Verified</span>
                    ) : (
                        <span className={`badge ${riskClass}`}>{risk}</span>
                    )}
                    <div className="cred-expand-icon">{expanded ? '▲' : '▼'}</div>
                </div>
            </div>

            {expanded && (
                <div className="cred-details animate-fadeIn">
                    {forensic.visualIssuer && (
                        <div className="cred-detail-row highlight-ai">
                            <span className="text-muted text-xs">Visual Identity</span>
                            <span className="text-xs">
                                🏢 {forensic.visualIssuer} {forensic.issuerMatch === 'Verified' ? '✅' : '🚨'}
                            </span>
                        </div>
                    )}
                    {forensic.handwriting && (
                        <div className="cred-detail-row forensic-row">
                            <span className="text-muted text-xs">Handwriting Scan</span>
                            <span className="text-xs italic">
                                🖋️ Deciphered: "{forensic.handwriting}"
                            </span>
                        </div>
                    )}
                    <div className="cred-detail-row">
                        <span className="text-muted text-xs">Auth Pipeline</span>
                        <span className="text-xs" style={isBlockchainVerified ? { color: 'var(--blue-primary)', fontWeight: 600 } : {}}>
                            {verifiedBy || (aiAnalysis?.agent?.replace('Authenticity Analysis Agent ', '') || 'Standard')}
                            {!isBlockchainVerified && ` (${forensic.device || 'N/A'})`}
                        </span>
                    </div>
                    <div className="cred-detail-row">
                        <span className="text-muted text-xs">Tamper Status</span>
                        <span style={{ color: tampered ? 'var(--red-danger)' : 'var(--green-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {tampered ? '⚠️ TAMPERED' : '✅ Intact'}
                        </span>
                    </div>
                    <div className="cred-detail-row">
                        <span className="text-muted text-xs">Digital Hash</span>
                        <span className="cred-hash">{integrityHash?.slice(0, 24)}...</span>
                    </div>

                    {credential.findings?.length > 0 ? (
                        <div className="cred-findings">
                            {credential.findings.map((f, i) => (
                                <div key={i} className="text-xs mt-1">
                                    {f.startsWith('✅') ? '🟢' : f.startsWith('🚨') ? '🔴' : '🟡'} {f}
                                </div>
                            ))}
                        </div>
                    ) : (
                        aiAnalysis?.findings?.length > 0 && (
                            <div className="cred-findings">
                                {aiAnalysis.findings.map((f, i) => (
                                    <div key={i} className="text-xs mt-1">
                                        {f.startsWith('✅') ? '🟢' : f.startsWith('🚨') ? '🔴' : '🟡'} {f}
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    <div className="cred-recommendation">
                        🤖 {aiAnalysis?.recommendation}
                    </div>
                </div>
            )}
        </div>
    );
}
