const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Local Cache Fallback (for limited mode)
const CACHE_FILE = path.join(__dirname, '../vault_cache.json');
const getLocalCache = () => {
    if (!fs.existsSync(CACHE_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch { return {}; }
};
const saveToLocalCache = (hash, credential) => {
    const cache = getLocalCache();
    cache[hash] = credential;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.txt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDFs, Images, and basic Document formats are allowed.'));
        }
    }
});

const { analyzeDocumentAuthenticity } = require('../agents/authenticityAgent');
const { attemptDocumentRecovery } = require('../agents/recoveryAgent');
const { verifyOnChain } = require('../agents/blockchainAgent');
const { verifyToken } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');

// Database helper
const getDb = () => (admin.apps.length ? admin.firestore() : null);

// POST /api/documents/analyze
// Accepts file upload, returns SHA-256 hash + AI analysis
router.post('/analyze', verifyToken, upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Compute SHA-256 hash of the file
        const fileBuffer = fs.readFileSync(req.file.path);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // DATABASE: Get handle once
        const db = getDb();
        const userId = req.user.uid;

        if (db) {
            try {
                const existingDocs = await db.collection('users').doc(userId).collection('credentials')
                    .where('integrityHash', '==', hash)
                    .limit(1)
                    .get();

                if (!existingDocs.empty) {
                    const existingCred = existingDocs.docs[0].data();
                    console.log(`♻️ [Deduplication] Found existing analysis for hash: ${hash.slice(0, 8)}...`);
                    // Clean up temp file
                    fs.unlinkSync(req.file.path);
                    return res.json({ success: true, credential: existingCred, cached: true });
                }
            } catch (fsLookupErr) {
                console.error('[Firestore Lookup Error]', fsLookupErr);
            }
        } else {
            // Local Cache Fallback Login
            const localCache = getLocalCache();
            if (localCache[hash]) {
                console.log(`♻️ [Local Deduplication] Found existing analysis for hash: ${hash.slice(0, 8)}...`);
                fs.unlinkSync(req.file.path);
                return res.json({ success: true, credential: localCache[hash], cached: true });
            }
        }

        // STAGE 0: CRYPTOGRAPHIC BLOCKCHAIN VERIFICATION
        const blockchainCheck = verifyOnChain(hash);
        let analysis = null;
        let isBlockchainVerified = false;
        let recoveryData = null;

        if (blockchainCheck.isAuthentic) {
            console.log(`[Documents] ⛓️ Blockchain Match: ${req.file.originalname}. Bypassing AI Analysis.`);
            isBlockchainVerified = true;
            analysis = {
                authenticityScore: 100,
                confidenceScore: 100,
                riskLevel: 'Low',
                status: 'Authentic',
                verifiedBy: `Ethereum Smart Contract (Tx: ${blockchainCheck.txId})`,
                issuer: blockchainCheck.issuer || "Verified Issuer",
                detectedType: 'Certified Document',
                documentContext: `Cryptographically verified on-chain at ${blockchainCheck.timestamp}`,
                findings: ['✅ 100% Cryptographic Match on Blockchain Ledger'],
                timestamp: new Date().toISOString(),
                recommendation: 'Document is cryptographically authentic on the blockchain.'
            };
        } else {
            // Real AI analysis using OCR (Async)
            console.log(`[Documents] Analyzing ${req.file.originalname} using Agentic AI...`);
            analysis = await analyzeDocumentAuthenticity(req.file.path, req.file.originalname);
        }

        // --- Smart Recovery Agent Integration ---
        if (!isBlockchainVerified && analysis.confidenceScore !== undefined && analysis.confidenceScore < 60 && analysis.riskLevel === 'High') {
            const recoveryResult = await attemptDocumentRecovery(
                req.file.path,
                req.file.originalname,
                analysis.findings ? analysis.findings.join(' | ') : analysis.status
            );

            if (recoveryResult && recoveryResult.recovered) {
                recoveryData = recoveryResult;
                analysis.confidenceScore = recoveryResult.newScore;
                analysis.riskLevel = recoveryResult.newRiskLevel;
                analysis.verifiedBy = recoveryResult.verifiedBy;
                if (!analysis.findings) analysis.findings = [];
                analysis.findings.push(...recoveryResult.recoveryNotes);
            }
        }

        let storageUrl = null;
        const bucket = admin.apps.length ? admin.storage().bucket() : null;

        // CLOUD STORAGE: Upload to Firebase Storage
        if (bucket) {
            try {
                const storagePath = `documents/${Date.now()}-${req.file.originalname}`;
                const uploadResult = await bucket.upload(req.file.path, {
                    destination: storagePath,
                    public: true,
                    metadata: {
                        contentType: req.file.mimetype,
                        metadata: { firebaseStorageDownloadTokens: crypto.randomUUID() }
                    }
                });
                storageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
                console.log(`✅ [Storage] File uploaded to: ${storageUrl}`);
            } catch (storageErr) {
                console.error('[Storage Error]', storageErr);
            }
        }

        const localUrl = `http://${req.get('host')}/uploads/${req.file.filename}`;

        // Build credential object
        const credential = {
            id: `cred_${Date.now()}`,
            originalName: req.file.originalname,
            storedName: req.file.filename,
            fileUrl: storageUrl || localUrl, // Real cloud URL or Local Fallback
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            integrityHash: hash,
            tampered: false,
            aiAnalysis: {
                documentType: analysis.detectedType || 'Unknown Document',
                authenticityScore: analysis.confidenceScore || 100,
                riskLevel: analysis.riskLevel || (analysis.confidenceScore > 80 ? 'Low' : analysis.confidenceScore > 60 ? 'Medium' : 'High'),
                status: analysis.status || 'Authentic',
                warnings: analysis.findings || [],
                visualAIData: analysis.visualAIData || null,
                analysisTimestamp: analysis.timestamp || new Date().toISOString(),
                ocrResults: analysis.detectedTextSnippet || '',
                recommendation: analysis.recommendation || analysis.status || '',
                recoveryAction: recoveryData ? recoveryData : null,
                verifiedBy: analysis.verifiedBy || 'Trustora AI Guardian',
                issuer: analysis.issuer || "Unknown Issuer"
            },
            category: analysis.category || "Uncategorized",
            tags: analysis.tags || [],
            forensicData: analysis.forensicData || null
        };

        // PERSISTENCE: Save to Firestore if available
        if (db) {
            try {
                await db.collection('users').doc(userId).collection('credentials').doc(credential.id).set(credential);
                console.log(`✅ [Firestore] Credential ${credential.id} saved for user ${userId}`);
            } catch (fsErr) {
                console.error('[Firestore Save Error]', fsErr);
            }
        } else {
            // Save to local cache anyway to ensure consistency in subsequent uploads
            saveToLocalCache(hash, credential);
            console.log(`💾 [Local Cache] Credential ${credential.id} secured locally.`);
        }

        res.json({ success: true, credential });
    } catch (err) {
        console.error('Analysis error:', err);
        res.status(500).json({ error: 'Failed to analyze document.' });
    }
});

// POST /api/documents/verify-integrity
// Given a hash and file, checks if file still matches original hash
router.post('/verify-integrity', upload.single('document'), (req, res) => {
    if (!req.file || !req.body.originalHash) {
        return res.status(400).json({ error: 'File and original hash are required.' });
    }

    try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const tampered = currentHash !== req.body.originalHash;

        res.json({
            success: true,
            tampered,
            currentHash,
            originalHash: req.body.originalHash,
            message: tampered
                ? '⚠️ TAMPERED: File has been modified since original upload.'
                : '✅ INTEGRITY VERIFIED: File matches original hash.',
        });
    } catch (err) {
        res.status(500).json({ error: 'Integrity check failed.' });
    }
});

module.exports = router;
