const express = require('express');
const router = express.Router();
const { issueToChain, verifyOnChain } = require('../agents/blockchainAgent');

// POST /api/blockchain/issue
// Simulates an Issuer (e.g. University) registering a document hash to the blockchain
router.post('/issue', async (req, res) => {
    const { documentHash, issuerName, documentName, recipientName } = req.body;

    if (!documentHash || !issuerName) {
        return res.status(400).json({ error: 'documentHash and issuerName are required fields.' });
    }

    try {
        const tx = issueToChain(documentHash, issuerName, documentName, recipientName);
        res.json({
            success: true,
            message: 'Document successfully registered on the Trustora Smart Contract.',
            transaction: tx
        });
    } catch (err) {
        console.error('[Blockchain API Error]', err);
        res.status(500).json({ error: 'Failed to interact with smart contract.' });
    }
});

// GET /api/blockchain/verify/:hash
// Allows a public check of a document hash against the blockchain
router.get('/verify/:hash', async (req, res) => {
    const { hash } = req.params;

    try {
        const result = verifyOnChain(hash);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Blockchain API Error]', err);
        res.status(500).json({ error: 'Failed to query smart contract.' });
    }
});

module.exports = router;
