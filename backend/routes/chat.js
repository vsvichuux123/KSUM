const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// POST /api/chat
// Accepts a user message and a context object (e.g., list of credentials)
router.post('/', async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                error: 'Gemini API is not configured. Please add GEMINI_API_KEY to your backend .env file.'
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Build the prompt using the context
        const prompt = `
            You are the "Trustora Vault Assistant", a highly intelligent, polite, and helpful AI assistant embedded directly inside a user's secure digital credential vault.

            A user is asking you a question about their vault. 
            Below is the current context of credentials and documents stored in their vault:

            --- VAULT CONTEXT ---
            ${JSON.stringify(context, null, 2)}
            ---------------------

            User's Query: "${message}"

            INSTRUCTIONS:
            1. Answer the user's query directly and concisely based ONLY on the provided vault context.
            2. If they ask if they have a certain document, look through the context to see if anything matches and tell them the name of the document and its risk level.
            3. If they ask a general question about Trustora, explain that Trustora is a cryptographic zero-knowledge document verification platform.
            4. Keep your responses friendly, professional, and formatted in clean Markdown (use bolding for document names, bullet points if listing multiple things).
            5. Do NOT hallucinate documents that are not in the vault context. If they don't have it, explicitly say so.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ success: true, response: responseText });

    } catch (error) {
        console.error('[Chat API Error]', error);
        res.status(500).json({ error: 'Failed to process chat request.' });
    }
});

module.exports = router;
