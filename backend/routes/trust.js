const express = require('express');
const router = express.Router();
const { calculateTrustScore } = require('../agents/trustAgents');
const { verifyToken } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');

// Database helper
const getDb = () => (admin.apps.length ? admin.firestore() : null);

// DEMO_CREDENTIALS removed for real-world usage.

// GET /api/trust/score
router.get('/score', verifyToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.uid;

    try {
        let userCredentials = [];

        if (db) {
            const snapshot = await db.collection('users').doc(userId).collection('credentials').get();
            userCredentials = snapshot.docs.map(doc => doc.data());
        }

        // If no credentials in DB, calculateTrustScore handles an empty array correctly.
        const credentialsToScore = userCredentials;
        const score = calculateTrustScore(credentialsToScore);

        res.json({ success: true, trustData: score });
    } catch (err) {
        console.error('[Trust API] Error:', err);
        res.status(500).json({ error: 'Failed to calculate trust score.' });
    }
});

module.exports = router;
