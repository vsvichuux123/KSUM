import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './VaultAssistant.css';

const backendHost = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const BACKEND_URL = `http://${backendHost}:5000`;

export default function VaultAssistant({ credentials }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hi! I am your Trustora AI Guardian. Ask me anything about the documents in your vault!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            const res = await axios.post(`${BACKEND_URL}/api/chat`, {
                message: userMessage,
                context: credentials.map(c => ({
                    name: c.originalName,
                    type: c.aiAnalysis?.documentType,
                    risk: c.aiAnalysis?.riskLevel,
                    score: c.aiAnalysis?.authenticityScore,
                    category: c.category,
                    tags: c.tags,
                    date: c.uploadedAt
                }))
            });

            if (res.data.error) {
                setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${res.data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.response }]);
            }
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.error || "Sorry, I couldn't reach the backend server.";
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Connection Failed: ${errMsg}` }]);
        } finally {
            setLoading(false);
        }
    };

    const formatMessage = (text) => {
        // Very basic markdown parsing for bolding
        return { __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') };
    };

    return (
        <div className="vault-assistant-container">
            {/* Chatbot Toggle Button */}
            {!isOpen && (
                <button className="chat-toggle-btn animate-bounce" onClick={() => setIsOpen(true)}>
                    <span className="blob-icon">🤖</span>
                    <span className="tooltip">Ask AI Guardian</span>
                </button>
            )}

            {/* Chat Window */}
            <div className={`chat-window glass-card ${isOpen ? 'open' : ''}`}>
                <div className="chat-header">
                    <div className="flex-center" style={{ gap: '8px' }}>
                        <span className="blob-icon small">🤖</span>
                        <h3>AI Guardian</h3>
                    </div>
                    <button className="close-chat-btn" onClick={() => setIsOpen(false)}>✕</button>
                </div>

                <div className="chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`message-bubble ${msg.role}`}>
                            {msg.role === 'assistant' && <div className="avatar">🤖</div>}
                            <div className="bubble-text" dangerouslySetInnerHTML={formatMessage(msg.text)}></div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message-bubble assistant loading-bubble">
                            <div className="avatar">🤖</div>
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="chat-input-area border-t">
                    <input
                        type="text"
                        placeholder="Search or ask about your vault..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
                        📤
                    </button>
                </form>
            </div>
        </div>
    );
}
