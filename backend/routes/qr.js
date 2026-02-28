const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const os = require('os');

function getPrimaryIP() {
    const interfaces = os.networkInterfaces();
    let ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }

    // Prioritize Windows Mobile Hotspot / Local private networks for testing
    let primary = ips.find(ip => ip.address.startsWith('192.168.'));
    if (!primary) primary = ips.find(ip => ip.address.startsWith('10.'));
    if (!primary) primary = ips.find(ip => !ip.address.startsWith('172.'));

    return primary ? primary.address : (ips[0] ? ips[0].address : 'localhost');
}

const PRIMARY_IP = getPrimaryIP();

// GET /api/qr/:userId
// Generates a QR code for the user's Trustora public verification profile
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { url } = req.query;

    // Use provided URL (encoded from frontend) or fallback
    let verificationUrl = url ? decodeURIComponent(url) : `http://${PRIMARY_IP}:5173/v/${userId}`;

    // AUTO-REWRITE: If the URL is localhost or 127.0.0.1, swap it for the reachable IP and ensure port 5173.
    if (verificationUrl.includes('localhost') || verificationUrl.includes('127.0.0.1')) {
        verificationUrl = `http://${PRIMARY_IP}:5173/v/${userId}`;
        console.log(`📡 [QR Rewrite] Forced URL to ${verificationUrl} to ensure mobile scan works.`);
    }

    try {
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#7C3AED',  // Purple QR code
                light: '#0A0A0F', // Dark background
            },
        });

        res.json({
            success: true,
            userId,
            verificationUrl,
            qrDataUrl,
        });
    } catch (err) {
        console.error('QR generation error:', err);
        res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

module.exports = router;
