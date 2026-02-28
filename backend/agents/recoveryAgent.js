const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

// Initialize Gemini if key is present in environment
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Using flash model for speed since we just need a quick visual check
const model = genAI ? genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
}) : null;

/**
 * Smart Document Recovery Agent
 * Use Case: When a document fails basic OCR or authenticity analysis due to poor quality
 * (blurry, bad lighting, cropped), this agent takes over to explicitly diagnose the 
 * *visual* problem and tell the user exactly how to fix their photo.
 */
async function attemptDocumentRecovery(filePath, originalName, originalAnalysisReason) {
    console.log(`[Recovery Agent] Triggered for ${originalName}. Reason: ${originalAnalysisReason}`);

    if (!model) {
        console.warn("[Recovery Agent] Gemini API key missing. Cannot perform Smart Recovery.");
        return {
            agent: "Smart Document Recovery Agent",
            status: "Recovery Unavailable",
            suggestions: "Please ensure the document is clearly visible and well-lit.",
            timestamp: new Date().toISOString()
        };
    }

    try {
        // Determine mime type based on extension
        const ext = filePath.split('.').pop().toLowerCase();
        // If it's not a common image format Gemini supports, skip visual recovery
        if (!['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
            return {
                agent: "Smart Document Recovery Agent",
                status: "Format Not Supported for Agentic Recovery",
                suggestions: "Try uploading as a clear JPEG or PNG image.",
                timestamp: new Date().toISOString()
            };
        }

        let mimeType = `image/${ext}`;
        if (ext === 'jpg') mimeType = 'image/jpeg';

        // Convert local file to Generative Part
        const fileBytes = fs.readFileSync(filePath);
        const imagePart = {
            inlineData: {
                data: Buffer.from(fileBytes).toString("base64"),
                mimeType
            }
        };

        const prompt = `
        You are Trustora's Smart Document Recovery Agent. 
        A user uploaded this image of a document (Name: ${originalName}).
        The system rejected it or gave it a low authenticity score because it could not properly read or verify the contents.
        
        Your job is to look at the image and figure out *why* the system couldn't read it, then provide extremely polite, specific, and actionable instructions to the user on how to take a better picture.

        Analyze the image for:
        1. **Blurriness:** Is the text out of focus?
        2. **Lighting:** Is there strong glare, a shadow over the text, or is it too dark?
        3. **Cropping:** Are important edges of the document (like the signature line, photo corner, or header) cut off?
        4. **Angle:** Is the picture taken from a severe angle making it distorted?
        5. **Distractions:** Are there fingers covering text, or is the background too cluttered?

        Output a JSON object with this exact structure:
        {
            "isRecoverableVisualError": boolean (true if it's a bad photo like blur/glare, false if it's just a totally wrong/fake file),
            "primaryIssue": string (e.g., "Blurry Text", "Glare on Important Details", "Edges Cut Off"),
            "actionableFeedback": string (A highly specific 1-2 sentence instruction. e.g., "The top right corner with your face is cut off. Please zoom out slightly so all 4 corners are visible." or "There is a strong glare over the name field. Try taking the photo in indirect, natural light without flash.")
        }
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);

        console.log(`[Recovery Agent] Concluded: ${analysis.primaryIssue}`);

        return {
            agent: "Smart Document Recovery Agent",
            status: analysis.isRecoverableVisualError ? "Actionable Feedback Ready" : "Unrecoverable File",
            issue: analysis.primaryIssue,
            suggestions: analysis.actionableFeedback || "Ensure the document is clear, flat, and well-lit.",
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error("[Recovery Agent] Error during smart recovery:", error);
        return {
            agent: "Smart Document Recovery Agent",
            status: "Failed during recovery attempt",
            suggestions: "Please try uploading a clearer image.",
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = { attemptDocumentRecovery };
