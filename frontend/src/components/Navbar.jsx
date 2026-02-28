import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    async function handleLogout() {
        try {
            await logout();
            navigate('/');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    }

    const links = [
        { to: '/dashboard', label: 'Vault', icon: '🔐' },
        { to: '/requests', label: 'Requests', icon: '📩' },
        { to: '/upload', label: 'Upload', icon: '📤' },
        { to: '/profile', label: 'Profile', icon: '👤' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/dashboard" className="navbar-brand">
                    <span className="brand-shield">🛡️</span>
                    <span className="brand-name">Trustora</span>
                </Link>

                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                        >
                            <span className="nav-icon">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="navbar-right">
                    <div className="user-avatar" title={currentUser?.email}>
                        {currentUser?.displayName
                            ? currentUser.displayName.charAt(0).toUpperCase()
                            : currentUser?.email?.charAt(0).toUpperCase()}
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={handleLogout}>
                        Sign Out
                    </button>
                    <button
                        className="hamburger"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
