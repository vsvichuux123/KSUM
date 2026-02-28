const express = require('express');
const router = express.Router();
const { assessRequestRisk, provideConsentAdvice, generateAccessGrant } = require('../agents/riskAgents');
const { verifyToken } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');

// Database helper
const getDb = () => (admin.apps.length ? admin.firestore() : null);

// GET /api/requests
// Get all pending requests for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    const db = getDb();
    const userId = req.user.uid;

    try {
        let userRequests = [];

        if (db) {
            const snapshot = await db.collection('users').doc(userId).collection('requests').orderBy('createdAt', 'desc').get();
            userRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            console.warn('[Requests API] No DB connection available. Returning mock requests.');
            global.mockRequestsCache = global.mockRequestsCache || {};
            userRequests = global.mockRequestsCache[userId] || [];
            userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Run risk assessment for any request that hasn't been analyzed yet
        const analyzedRequests = userRequests.map(reqObj => {
            if (!reqObj.riskAssessment) {
                const risk = assessRequestRisk(reqObj);
                const advice = provideConsentAdvice(risk);
                return { ...reqObj, riskAssessment: risk, consentAdvice: advice };
            }
            return reqObj;
        });

        res.json({ success: true, requests: analyzedRequests });
    } catch (err) {
        console.error('[Requests API] Error:', err);
        res.status(500).json({ error: 'Failed to fetch requests.' });
    }
});

// GET /api/requests/:id
// Get a specific request (supports mock cache fallback)
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const db = getDb();

    try {
        let request = null;
        if (db) {
            const doc = await db.collection('users').doc(userId).collection('requests').doc(id).get();
            if (doc.exists) request = { id: doc.id, ...doc.data() };
        }

        if (!request) {
            // Check mock cache
            const mockReqs = (global.mockRequestsCache && global.mockRequestsCache[userId]) || [];
            request = mockReqs.find(r => r.id === id);
        }

        if (!request) return res.status(404).json({ error: 'Request not found' });

        if (!request.riskAssessment) {
            request.riskAssessment = assessRequestRisk(request);
            request.consentAdvice = provideConsentAdvice(request.riskAssessment);
        }

        res.json({ success: true, request });
    } catch (err) {
        console.error('[Requests API] Error fetching single request:', err);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});


// POST /api/requests/:id/decide
// Approve or Reject a request
router.post('/:id/decide', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { decision } = req.body;
    const userId = req.user.uid;
    const db = getDb();

    try {
        let request;
        const status = decision === 'Approve' ? 'Approved' : 'Rejected';
        const accessGrant = decision === 'Approve' ? generateAccessGrant(id) : null;

        if (db) {
            const docRef = db.collection('users').doc(userId).collection('requests').doc(id);
            const doc = await docRef.get();
            if (doc.exists) {
                request = doc.data();
                await docRef.update({ status, accessGrant });
                request.status = status;
                request.accessGrant = accessGrant;
            }
        }

        if (!request) {
            // Try mock cache
            const mockReqs = (global.mockRequestsCache && global.mockRequestsCache[userId]) || [];
            request = mockReqs.find(r => r.id === id);
            if (request) {
                request.status = status;
                request.accessGrant = accessGrant;
            }
        }

        if (!request) return res.status(404).json({ error: 'Request not found' });

        res.json({
            success: true,
            status: request.status,
            accessGrant: request.accessGrant,
            message: decision === 'Approve' ? '✅ Approved' : '❌ Rejected'
        });
    } catch (err) {
        console.error('[Requests API] Error deciding request:', err);
        res.status(500).json({ error: 'Decision failed' });
    }
});

// POST /api/requests/simulate
router.post('/simulate', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const db = getDb();

    const newReq = {
        id: `req_${Date.now()}`,
        verifier: req.body.verifier || 'Meta Corp',
        requestedDocs: req.body.docs || [{ name: 'BTech_Certificate.pdf', type: 'Academic Certificate' }],
        status: 'Pending',
        createdAt: new Date().toISOString(),
        riskAssessment: null,
        consentAdvice: null
    };

    if (db) {
        await db.collection('users').doc(userId).collection('requests').doc(newReq.id).set(newReq);
    } else {
        return res.status(500).json({ error: 'Database connection failed' });
    }

    res.json({ success: true, request: newReq });
});

module.exports = router;
