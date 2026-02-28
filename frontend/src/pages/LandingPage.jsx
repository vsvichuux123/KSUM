import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const features = [
    {
        icon: '🤖',
        title: 'AI Guardian',
        desc: 'An autonomous agent evaluates every access request, assesses risk, and protects your credentials 24/7.',
        delay: 'delay-100',
    },
    {
        icon: '⛓️',
        title: 'Tamper Detection',
        desc: 'SHA-256 cryptographic hashing creates an unforgeable fingerprint for every document you upload.',
        delay: 'delay-200',
    },
    {
        icon: '📷',
        title: 'QR Identity',
        desc: 'Generate a unique QR code that lets verifiers instantly access your approved credentials securely.',
        delay: 'delay-300',
    },
    {
        icon: '🔐',
        title: 'Consent Control',
        desc: 'You decide what to share, with whom, and for how long. Your data never leaves without your approval.',
        delay: 'delay-400',
    },
    {
        icon: '🧠',
        title: 'AI Analysis',
        desc: 'Every document receives an authenticity confidence score powered by AI-based anomaly detection.',
        delay: 'delay-100',
    },
    {
        icon: '👁️',
        title: 'Continuous Monitoring',
        desc: 'The guardian watches for suspicious patterns even after sharing — your protection never sleeps.',
        delay: 'delay-200',
    },
];

const steps = [
    { num: '01', title: 'Create Your Vault', desc: 'Sign up and get a secure digital identity vault.' },
    { num: '02', title: 'Upload Documents', desc: 'Upload certificates, IDs, and achievements.' },
    { num: '03', title: 'AI Analysis', desc: 'AI scans, scores, and protects every document.' },
    { num: '04', title: 'Share Securely', desc: 'Control who sees what — with one-tap consent.' },
];

export default function LandingPage() {
    return (
        <div className="landing">
            {/* Hero */}
            <section className="hero">
                <div className="hero-content container">
                    <div className="hero-badge animate-fadeIn">
                        <span>🛡️</span> AI-Powered Credential Guardian
                    </div>
                    <h1 className="hero-title animate-fadeInUp delay-100">
                        Your Documents.<br />
                        <span className="gradient-text">Protected by Intelligence.</span>
                    </h1>
                    <p className="hero-subtitle animate-fadeInUp delay-200">
                        Trustora transforms your certificates and credentials into a verifiable digital identity —
                        secured by AI, protected by cryptography, and controlled entirely by you.
                    </p>
                    <div className="hero-cta animate-fadeInUp delay-300">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            🚀 Start for Free
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg">
                            Sign In
                        </Link>
                    </div>
                    <div className="hero-trust animate-fadeIn delay-400">
                        <span>✅ No credit card required</span>
                        <span>✅ 100% free stack</span>
                        <span>✅ Your data, your control</span>
                    </div>
                </div>

                {/* Floating credential cards */}
                <div className="hero-visual">
                    <div className="floating-card card-1">
                        <div className="fc-icon">🎓</div>
                        <div>
                            <div className="fc-title">B.Tech Certificate</div>
                            <div className="fc-sub">Kerala University · 2024</div>
                        </div>
                        <span className="badge badge-low">Low Risk</span>
                    </div>
                    <div className="floating-card card-2">
                        <div className="fc-icon">🏆</div>
                        <div>
                            <div className="fc-title">Hackathon Winner</div>
                            <div className="fc-sub">KSUM · 2024</div>
                        </div>
                        <div className="score-pill">98% ✅</div>
                    </div>
                    <div className="floating-card card-3">
                        <div className="fc-icon">📜</div>
                        <div>
                            <div className="fc-title">AI/ML Certificate</div>
                            <div className="fc-sub">Coursera · 2023</div>
                        </div>
                        <span className="badge badge-verified">Verified</span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header text-center">
                        <h2>Why Trustora?</h2>
                        <p className="text-secondary">Everything you need for secure, intelligent credential management.</p>
                    </div>
                    <div className="features-grid">
                        {features.map((f) => (
                            <div key={f.title} className={`feature-card glass-card animate-fadeInUp ${f.delay}`}>
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p className="text-secondary">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="how-section">
                <div className="container">
                    <div className="section-header text-center">
                        <h2>How It Works</h2>
                        <p className="text-secondary">Four steps to a fully protected digital identity.</p>
                    </div>
                    <div className="steps-row">
                        {steps.map((step, i) => (
                            <React.Fragment key={step.num}>
                                <div className="step-item">
                                    <div className="step-num">{step.num}</div>
                                    <h4>{step.title}</h4>
                                    <p className="text-secondary text-sm">{step.desc}</p>
                                </div>
                                {i < steps.length - 1 && <div className="step-connector" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta-section">
                <div className="container cta-inner glass-card text-center">
                    <h2>Ready to protect your credentials?</h2>
                    <p className="text-secondary">Join thousands of students and professionals who trust Trustora.</p>
                    <Link to="/register" className="btn btn-primary btn-lg mt-24">
                        🛡️ Create Your Vault — It's Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <span>🛡️ Trustora</span>
                <span className="text-muted text-sm">© 2024 · Built with ❤️ for KSUM</span>
            </footer>
        </div>
    );
}
