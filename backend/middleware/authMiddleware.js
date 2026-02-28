const admin = require('firebase-admin');

/**
 * Auth Middleware
 * Verifies the Firebase ID Token sent in the Authorization header.
 * Usage: router.get('/protected', verifyToken, (req, res) => { ... })
 */
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (admin.apps.length === 0) {
        console.warn('⚠️  Auth service unavailable. Using mock token parsing.');
        try {
            const payloadStr = Buffer.from(idToken.split('.')[1], 'base64').toString("utf8");
            const payload = JSON.parse(payloadStr);
            req.user = {
                ...payload,
                uid: payload.user_id || payload.sub || 'demo_user'
            };
            return next();
        } catch (e) {
            req.user = { uid: 'demo_user' };
            return next();
        }
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('[Auth Error]', error.message);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}

module.exports = { verifyToken };
