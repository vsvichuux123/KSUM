const Tesseract = require('tesseract.js');
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');

// Initialize HF Inference if key is present in environment
const hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

/**
 * Authenticity Analysis Agent (v7 - Deep Tamper Forensic & Gemini Pulse)
 * Forensic Stack:
 * 1. Tesseract OCR (Base Content)
 * 2. Visual LayoutLM (Structural IQ)
 * 3. TrOCR (Handwriting Forensic)
 * 4. Semantic Identity Mapping (all-MiniLM-L6-v2)
 * 5. OCR-Free Pulse (Donut Fallback)
 * 6. Deep Tamper Map (TruFor GPU-Accelerated)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini if key is present in environment
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } }) : null;

/**
 * Authenticity Analysis Agent (v8 - Gemini Semantic Brain)
 */
async function analyzeDocumentAuthenticity(filePath, originalName) {
    console.log(`[Authenticity Agent v8] Starting Agentic Analysis: ${originalName}`);

    const findings = [];
    let detectedType = 'Unknown Document';
    let documentContext = '';
    let isSkipFormat = false;

    try {
        // --- STAGE 1: Tesseract OCR (Local Extraction) OR Heuristics ---
        const ext = path.extname(filePath).toLowerCase();
        const skipFormats = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf'];
        isSkipFormat = skipFormats.includes(ext);

        if (isSkipFormat) {
            console.log(`[Authenticity Agent] Document format (${ext}) detected: ${originalName}. Using heuristics for context...`);
            const stats = fs.statSync(filePath);
            documentContext = `File Name: ${originalName}\nFile Type: Extension ${ext.toUpperCase()}\nFile Size: ${stats.size} bytes. (Text extraction skipped due to format).`;
        } else {
            console.log(`[Authenticity Agent] Initializing Tesseract for image extraction on ${ext}...`);
            const tesseractPromise = Tesseract.recognize(filePath, 'eng', { logger: m => { if (m.status === 'recognizing text') console.log(`[Tesseract] Progress: ${Math.round(m.progress * 100)}%`); } });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout (30s)')), 30000));

            try {
                const tesseractRes = await Promise.race([tesseractPromise, timeoutPromise]);
                documentContext = tesseractRes.data.text;
                findings.push(`Local OCR Success (Confidence: ${tesseractRes.data.confidence}%)`);
            } catch (ocrErr) {
                console.warn(`[OCR Warning] Tesseract failed/timed out: ${ocrErr.message}`);
                documentContext = `File Name: ${originalName}\n(OCR failed, treating solely based on metadata).`;
            }
        }

        // --- STAGE 1.5: Forensic Image Analysis ---
        let forensicData = null;
        const imageFormats = ['.jpg', '.jpeg', '.png', '.tiff', '.bmp'];
        if (imageFormats.includes(ext)) {
            console.log(`[Authenticity Agent] Running Forensic EXIF/Tamper check on image...`);
            try {
                const scriptPath = path.join(__dirname, '../forensics/trufor_bridge.py');
                const { stdout } = await execPromise(`python "${scriptPath}" "${filePath}"`);
                forensicData = JSON.parse(stdout.trim());
                if (forensicData.status === 'success') {
                    if (forensicData.anomalies_detected > 0) {
                        findings.push(`⚠️ Forensic Anomalies: ${forensicData.message}`);
                    } else {
                        findings.push(`✅ Forensic Check Passed: ${forensicData.message}`);
                    }
                }
            } catch (forensicErr) {
                console.warn(`[Forensic Warning] Python bridge failed:`, forensicErr.message);
                findings.push('⚠️ Python forensic analysis skipped (Error or missing dependencies)');
            }
        }

        // --- STAGE 2: Gemini Semantic Reasoning ---
        let finalAnalysis = null;

        if (model) {
            console.log(`[Authenticity Agent] Passing context to Gemini-1.5-Flash for Deep Semantic Analysis...`);

            const prompt = `
            You are Trustora's elite Forensic AI Guardian. Analyze the following document context (extracted text or metadata) and determine its authenticity, category, and risk profile.

            Document Original Name: ${originalName}
            Extracted Context/Text: 
            """
            ${documentContext.slice(0, 5000) /* Limit to keep tokens reasonable if OCR goes wild */}
            """

            Provide your forensic analysis strictly in the following JSON structure:
            {
                "authenticityScore": number (0 to 100, where 100 is highly authentic and 0 is fake/suspicious),
                "riskLevel": string ("Low", "Medium", or "High"),
                "detectedType": string (e.g., "Academic Transcript", "Government ID", "Financial Report", "Project Proposal"),
                "category": string (Broad category like "Identity", "Academic", "Financial", "Work", "Other"),
                "tags": array of strings (3-5 highly relevant tags),
                "recommendation": string (A 1-2 sentence explanation of your reasoning and advice for the verifier)
            }

            Reasoning Guidelines:
            - Look for institutional keywords, professional formatting hints, and semantic consistency.
            - If it mentions "draft", is an obviously blank template, or lacks any coherent structure, lower the score and raise the risk.
            - If it looks like a standard professional document (like a project proposal or known template), give a reasonable score but classify correctly.
            `;

            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                finalAnalysis = JSON.parse(responseText);
                findings.push('🧠 Gemini Flash: Deep Semantic Analysis Applied');
                console.log(`[Authenticity Agent] Gemini Analysis Complete: Category=${finalAnalysis.category}, Score=${finalAnalysis.authenticityScore}`);
            } catch (geminiError) {
                console.error("[Authenticity Agent] Gemini API Error:", geminiError);
                findings.push('⚠️ Gemini Analysis Failed (Fallback to Heuristics/OCR Baseline)');
            }
        } else {
            console.log(`[Authenticity Agent] GEMINI_API_KEY not found. Operating in legacy offline mode.`);
            findings.push('⚠️ Semantic Analysis Offline (Missing Google API Key)');
        }

        // --- STAGE 3: Aggregation & Fallback ---
        // If Gemini failed or is missing, fall back to basic heuristics
        if (!finalAnalysis) {
            const nameLower = originalName.toLowerCase();
            if (nameLower.includes('transcript') || nameLower.includes('mark')) detectedType = 'Academic Transcript';
            else if (nameLower.includes('certif')) detectedType = 'Official Certificate';
            else if (nameLower.includes('id') || nameLower.includes('aadhar')) detectedType = 'Government ID';
            else detectedType = `Electronic Document (${ext.toUpperCase()})`;

            finalAnalysis = {
                authenticityScore: isSkipFormat ? 80 : 75,
                riskLevel: isSkipFormat ? "Low" : "Medium",
                detectedType: detectedType,
                category: "Uncategorized",
                tags: ["fallback", ext.replace('.', '')],
                recommendation: "Analyzed offline using basic heuristics."
            };
        }

        return {
            agent: "Authenticity Analysis Agent (v8 - Gemini Semantic Engine)",
            version: "8.0.0",
            detectedType: finalAnalysis.detectedType,
            confidenceScore: finalAnalysis.authenticityScore,
            status: finalAnalysis.authenticityScore > 85 ? 'Authentic' : finalAnalysis.authenticityScore > 65 ? 'Suspicious' : 'Potentially Fraudulent',
            findings: findings,
            recommendation: finalAnalysis.recommendation,
            category: finalAnalysis.category,
            tags: finalAnalysis.tags,
            timestamp: new Date().toISOString(),
            // Mapping for documents.js legacy support
            detectedTextSnippet: documentContext.slice(0, 500),
            forensicData: forensicData
        };

    } catch (error) {
        console.error("[Authenticity Agent v8] Critical Error:", error);
        return {
            agent: "Authenticity Analysis Agent (v8)",
            confidenceScore: 30,
            findings: ["Critical Audit Failure: " + error.message],
            status: "Error",
            category: "Error",
            tags: ["error"],
            timestamp: new Date().toISOString()
        };
    }
}


module.exports = { analyzeDocumentAuthenticity };
