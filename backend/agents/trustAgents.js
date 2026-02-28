/**
 * Trust Scoring Agent
 * Use Case: Calculates an overall credibility score for the user 
 * based on their verified credentials.
 */
function calculateTrustScore(credentials) {
    if (!credentials || credentials.length === 0) return 30; // Base score for new users

    const totalDocs = credentials.length;
    const verifiedDocs = credentials.filter(c => c.aiAnalysis?.authenticityScore > 80).length;
    const tamperedDocs = credentials.filter(c => c.tampered).length;

    let score = 30 + (verifiedDocs * 10); // +10 for each verified doc

    // Penalize for tampered docs
    score -= (tamperedDocs * 50);

    // Bonus for variety
    const docTypes = new Set(credentials.map(c => c.aiAnalysis?.documentType));
    score += docTypes.size * 5;

    // Cap the score
    score = Math.max(0, Math.min(100, score));

    let level = "Bronze";
    if (score > 85) level = "Diamond";
    else if (score > 70) level = "Gold";
    else if (score > 50) level = "Silver";

    return {
        agent: "Trust Scoring Agent",
        trustScore: score,
        trustLevel: level,
        verifiedCount: verifiedDocs,
        tamperedCount: tamperedDocs,
        timestamp: new Date().toISOString()
    };
}

/**
 * Monitoring Agent
 * Use Case: Continuously observes system activity to detect abnormal 
 * behavior or repeated suspicious requests.
 */
function monitorActivity(logs) {
    const recentLogs = logs.slice(-20); // Last 20 actions
    const suspiciousActions = recentLogs.filter(l => l.riskLevel === "High" || l.status === "Failed");

    const anomalyDetected = suspiciousActions.length > 5;

    return {
        agent: "Monitoring Agent",
        anomalyDetected,
        suspiciousCount: suspiciousActions.length,
        status: anomalyDetected ? "CRITICAL: SUSPICIOUS ACTIVITY" : "Healthy",
        timestamp: new Date().toISOString()
    };
}

module.exports = { calculateTrustScore, monitorActivity };
