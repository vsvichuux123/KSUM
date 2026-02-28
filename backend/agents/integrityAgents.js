const crypto = require('crypto');

/**
 * Integrity Verification Agent
 * Use Case: Checks whether a document has been altered after upload 
 * by verifying its digital fingerprint.
 */
function verifyIntegrity(currentBuffer, originalHash) {
    const currentHash = crypto.createHash('sha256').update(currentBuffer).digest('hex');
    const isMatch = currentHash === originalHash;

    return {
        agent: "Integrity Verification Agent",
        isTampered: !isMatch,
        currentHash,
        originalHash,
        status: isMatch ? "Verified" : "ALERT: TAMPERED",
        timestamp: new Date().toISOString()
    };
}

module.exports = { evaluateAuthenticity, verifyIntegrity };
