/**
 * Risk Assessment Agent
 * Use Case: Analyzes each document request to determine whether 
 * sharing the requested data is safe.
 */
function assessRequestRisk(request) {
    const { verifier, requestedDocs, context } = request;

    let riskScore = 0;
    const riskFactors = [];

    // Verifier credibility check
    const trustedVerifiers = ['Google', 'KSUM', 'Kerala University', 'IIT Madras'];
    if (!trustedVerifiers.includes(verifier)) {
        riskScore += 30;
        riskFactors.push("Unknown or untrusted verifier entity");
    }

    // Sensitivity analysis
    requestedDocs.forEach(doc => {
        if (doc.type === 'ID Document' || doc.type === 'Passport') {
            riskScore += 40;
            riskFactors.push(`High sensitivity document requested: ${doc.name}`);
        } else if (doc.type === 'Academic Transcript') {
            riskScore += 15;
        }
    });

    // Risk leveling
    let level = "Low";
    if (riskScore > 60) level = "High";
    else if (riskScore > 30) level = "Medium";

    return {
        agent: "Risk Assessment Agent",
        riskLevel: level,
        riskScore,
        riskFactors,
        timestamp: new Date().toISOString()
    };
}

/**
 * Consent Advisor Agent
 * Use Case: Recommends what documents the user should share 
 * based on risk and privacy.
 */
function provideConsentAdvice(riskAssessment) {
    let recommendation = "Approve";
    let reasoning = "The request appears safe and the verifier is trusted.";

    if (riskAssessment.riskLevel === "High") {
        recommendation = "Reject / Limit";
        reasoning = "High risk detected due to sensitive document types or unknown verifier. Sharing is not recommended without further verification.";
    } else if (riskAssessment.riskLevel === "Medium") {
        recommendation = "Partial Approval";
        reasoning = "Moderate risk. Recommend sharing only necessary documents and setting a short access window.";
    }

    return {
        agent: "Consent Advisor Agent",
        recommendation,
        reasoning,
        timestamp: new Date().toISOString()
    };
}

/**
 * Access Control Agent
 * Use Case: Grants controlled, time-limited access to approved documents.
 */
function generateAccessGrant(requestId, durationMinutes = 60) {
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);

    return {
        agent: "Access Control Agent",
        accessToken: token,
        expiresAt: expiresAt.toISOString(),
        status: "Active",
        accessUrl: `http://localhost:5173/verify/access?token=${token}`
    };
}

module.exports = { assessRequestRisk, provideConsentAdvice, generateAccessGrant };
