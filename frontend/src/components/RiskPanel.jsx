import React from 'react';
import './RiskPanel.css';

export default function RiskPanel({ credentials }) {
    const total = credentials.length;
    const lowCount = credentials.filter(c => c.aiAnalysis?.riskLevel === 'Low').length;
    const medCount = credentials.filter(c => c.aiAnalysis?.riskLevel === 'Medium').length;
    const highCount = credentials.filter(c => c.aiAnalysis?.riskLevel === 'High').length;
    const tampered = credentials.filter(c => c.tampered).length;

    const overallRisk = highCount > 0 ? 'High' : medCount > 0 ? 'Medium' : 'Low';
    const overallClass = overallRisk === 'Low' ? 'badge-low' : overallRisk === 'Medium' ? 'badge-medium' : 'badge-high';
    const overallIcon = overallRisk === 'Low' ? '🟢' : overallRisk === 'Medium' ? '🟡' : '🔴';

    const riskMsg = overallRisk === 'Low'
        ? 'All your credentials are in excellent shape. No threats detected.'
        : overallRisk === 'Medium'
            ? 'Some credentials have minor anomalies. Review highlighted documents.'
            : 'Critical: One or more credentials show signs of tampering. Immediate review required.';

    return (
        <div className="risk-panel glass-card">
            <div className="risk-panel-header">
                <div>
                    <div className="risk-panel-title">
                        <span className="risk-panel-icon">🤖</span>
                        <h3>AI Guardian — Risk Assessment</h3>
                    </div>
                    <p className="text-secondary text-sm">Continuous analysis of your credential vault</p>
                </div>
                <div className="risk-overall">
                    <span className={`badge ${overallClass}`}>
                        {overallIcon} {overallRisk} Overall Risk
                    </span>
                </div>
            </div>

            <div className="risk-bars">
                <div className="risk-bar-item">
                    <div className="risk-bar-label">
                        <span>🟢 Low Risk</span>
                        <span>{lowCount} doc{lowCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="progress-bar-track">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: total ? `${(lowCount / total) * 100}%` : '0%',
                                background: 'var(--green-success)'
                            }}
                        />
                    </div>
                </div>
                <div className="risk-bar-item">
                    <div className="risk-bar-label">
                        <span>🟡 Medium Risk</span>
                        <span>{medCount} doc{medCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="progress-bar-track">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: total ? `${(medCount / total) * 100}%` : '0%',
                                background: 'var(--yellow-warning)'
                            }}
                        />
                    </div>
                </div>
                <div className="risk-bar-item">
                    <div className="risk-bar-label">
                        <span>🔴 High Risk</span>
                        <span>{highCount} doc{highCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="progress-bar-track">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: total ? `${(highCount / total) * 100}%` : '0%',
                                background: 'var(--red-danger)'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className={`risk-message alert ${overallRisk === 'Low' ? 'alert-success' : overallRisk === 'Medium' ? 'alert-warning' : 'alert-error'}`}>
                <span>{overallRisk === 'Low' ? '✅' : overallRisk === 'Medium' ? '⚠️' : '🚨'}</span>
                <span>{riskMsg}</span>
            </div>

            {tampered > 0 && (
                <div className="alert alert-error">
                    <span>🚨</span>
                    <span><strong>{tampered} tampered document{tampered > 1 ? 's' : ''} detected!</strong> Integrity check failed — immediately review affected credentials.</span>
                </div>
            )}
        </div>
    );
}
