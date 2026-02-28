const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Helper to get Firestore
const getDb = () => (admin.apps.length ? admin.firestore() : null);

// GET /api/public/profile/:uid
// Returns public-safe metadata for Verifiers landing via QR code
router.get('/profile/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const db = getDb();
        if (!db) {
            console.log(`[Public Route] Mock Mode: Returning mock profile for ${uid}.`);
            return res.json({
                name: 'Mock Trustora User',
                uid: uid,
                isVerified: true,
                availableDocumentTypes: ['Identity Document', 'Academic Certificate', 'Achievement Award']
            });
        }

        // 1. Get User Profile from Firebase Auth (if available)
        const userRecord = (admin.apps.length > 0)
            ? await admin.auth().getUser(uid).catch(() => null)
            : null;
        if (!userRecord) {
            return res.status(404).json({ error: 'User vault not found.' });
        }

        // 2. Scan their credentials to see what types of docs they have (for the request list)
        const credsSnapshot = await db.collection('users').doc(uid).collection('credentials').get();
        const availableTypes = [...new Set(credsSnapshot.docs.map(doc => doc.data().aiAnalysis?.documentType || 'Other'))];

        // 3. Return public info
        res.json({
            name: userRecord.displayName || 'Trustora User',
            uid: uid,
            isVerified: true,
            availableDocumentTypes: availableTypes.length > 0 ? availableTypes : ['Identity Document', 'Academic Certificate', 'Achievement Award']
        });

    } catch (err) {
        console.error('[Public Profile Error]', err);
        res.status(500).json({ error: 'Failed to fetch public profile.' });
    }
});

// POST /api/public/request/create
// Creates a new verification request in a user's vault from an external verifier
router.post('/request/create', async (req, res) => {
    try {
        const { targetUid, verifierName, requestedDocTypes } = req.body;

        if (!targetUid || !verifierName || !requestedDocTypes) {
            return res.status(400).json({ error: 'Missing required fields: targetUid, verifierName, requestedDocTypes' });
        }

        const db = getDb();

        const requestId = `req_live_${Date.now()}`;
        const newRequest = {
            id: requestId,
            verifier: verifierName,
            verifierLogo: null,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            requestedDocTypes: requestedDocTypes, // types requested
            requestedDocs: requestedDocTypes.map(type => ({ id: `type_${type}`, name: type, type: type })),
            riskAssessment: {
                riskLevel: 'Low',
                riskScore: 15,
                riskFactors: ['Standard QR Access', 'Direct Browser Request']
            },
            consentAdvice: {
                recommendation: 'REVIEW REQUIRED',
                reasoning: 'An external entity has requested verification via your public QR code.'
            }
        };

        if (!db) {
            console.log(`[Public Request] Mock Mode: Fake request saved to memory in ${targetUid}'s vault from ${verifierName}`);
            global.mockRequestsCache = global.mockRequestsCache || {};
            global.mockRequestsCache[targetUid] = global.mockRequestsCache[targetUid] || [];
            global.mockRequestsCache[targetUid].push(newRequest);

            return res.json({
                success: true,
                message: 'Request sent to user\'s vault (Mock Mode)!',
                requestId: requestId
            });
        }



        // 2. Save to user's requests collection
        await db.collection('users').doc(targetUid).collection('requests').doc(requestId).set(newRequest);

        console.log(`✅ [Public Request] New request created in ${targetUid}'s vault from ${verifierName}`);

        res.json({
            success: true,
            message: 'Request sent to user\'s vault!',
            requestId: requestId
        });

    } catch (err) {
        console.error('[Public Request Error]', err);
        res.status(500).json({ error: 'Failed to create verification request.' });
    }
});

// GET /api/public/request/status/:uid/:requestId
// Allows the public verifier page to poll the status of a request they just sent
router.get('/request/status/:uid/:requestId', async (req, res) => {
    try {
        const { uid, requestId } = req.params;
        const db = getDb();

        let request = null;

        if (db) {
            const doc = await db.collection('users').doc(uid).collection('requests').doc(requestId).get();
            if (doc.exists) {
                request = doc.data();
            }
        }

        if (!request) {
            // Check mock cache
            const mockReqs = (global.mockRequestsCache && global.mockRequestsCache[uid]) || [];
            request = mockReqs.find(r => r.id === requestId);
        }

        if (!request) return res.status(404).json({ error: 'Request not found' });

        res.json({
            success: true,
            status: request.status,
            accessGrant: request.status === 'Approved' ? request.accessGrant : null
        });

    } catch (err) {
        console.error('[Public Polling Error]', err);
        res.status(500).json({ error: 'Failed to poll request status.' });
    }
});

module.exports = router;
