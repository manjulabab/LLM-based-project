const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({}); 

const rfpSchema = {
    type: "object",
    properties: {
        title: { type: "string", description: "A concise, descriptive title for the RFP." },
        total_budget: { type: "number", description: "The total budgeted amount, if explicitly mentioned." },
        currency: { type: "string", description: "The currency of the budget (e.g., USD, EUR)." },
        delivery_days: { type: "integer", description: "The required delivery time in days." },
        payment_terms: { type: "string", description: "The required payment terms (e.g., Net 30, COD)." },
        warranty_months: { type: "integer", description: "The minimum required warranty period in months." },
        items: {
            type: "array",
            description: "Detailed breakdown of items requested in the RFP.",
            items: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the item requested." },
                    qty: { type: "integer", description: "Quantity requested." },
                    unit: { type: "string", description: "Unit of measurement (e.g., each, box, lot)." },
                    specs: { type: "string", description: "Key specifications or technical requirements for the item." }
                },
                required: ["name", "qty", "unit"]
            }
        }
    },
    required: ["title", "items"]
};

// Schema for comparing proposals and generating a ranked result
const comparisonSchema = {
    type: "object",
    properties: {
        ranked: {
            type: "array",
            description: "A list of vendors ranked by overall fit, best first.",
            items: {
                type: "object",
                properties: {
                    vendor_id: { type: "integer" },
                    vendor_name: { type: "string" },
                    score: { type: "number", description: "Final score from 0-100." },
                    reason: { type: "string", description: "A one-sentence reason for the ranking." }
                },
                required: ["vendor_id", "vendor_name", "score"]
            }
        },
        proposal_scores: {
            type: "array",
            description: "Detailed scoring for each individual proposal, matching the Proposal ID from the input.",
            items: {
                type: "object",
                properties: {
                    id: { type: "integer", description: "The Proposal ID (from the database) this score belongs to." },
                    completeness_score: { type: "number", description: "Score (0-100) based on how many RFP requirements were met." },
                    final_score: { type : "number", description: "The computed final score (0-100), considering price, delivery, and compliance." },
                    summary: { type: "string", description: "A short (2-3 sentence) summary of the proposal's strengths and weaknesses." }
                },
                required: ["id", "final_score", "summary"]
            }
        },
        explanation_text: {
            type: "string",
            description: "A detailed paragraph summarizing the overall comparison and the recommendation for the winning vendor."
        },
        comparative_table: {
            type: "string",
            description: "A complete Markdown-formatted table comparing key metrics (Price, Delivery Time, Warranty) for all vendors."
        }
    },
    required: ["ranked", "proposal_scores", "explanation_text"]
};


// Schema for extracting proposal details from raw email text (provided by user, now defined here)
const proposalSchema = {
    type: "object",
    properties: {
        grand_total: { type: "number", description: "The total price quoted by the vendor." },
        currency: { type: "string", description: "The currency of the quote (e.g., USD, EUR)." },
        shipping_days: { type: "integer", description: "The estimated delivery time in days." },
        payment_terms: { type: "string", description: "The payment terms offered (e.g., Net 30, COD)." },
        warranty_months: { type: "integer", description: "The warranty period in months." },
        items: {
            type: "array",
            description: "Detailed breakdown of items proposed.",
            items: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The exact name of the product offered." },
                    unit_price: { type: "number", description: "Price per unit." },
                    qty: { type: "integer", description: "Quantity offered." },
                    total: { type: "number", description: "Total price for this item (unit_price * qty)." },
                    specs: { type: "string", description: "Detailed specifications offered for this item (e.g., '16GB RAM')." } 
                },
                required: ["name", "unit_price", "qty", "total"]
            }
        }
    },
    required: ["grand_total", "currency", "shipping_days"]
};

async function generateStructuredJson(prompt, schema, systemInstruction = null) {
    try {
        const config = {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.1
        };

        if (systemInstruction) {
            config.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: prompt,
            config: config,
        });
        
        // The AI output is a JSON string, which must be parsed
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Gemini Structured JSON Error:", error.message);
        // Throw a user-friendly error
        throw new Error(`AI data extraction failed for schema ${schema.title || 'Unknown'}. Details: ${error.message}`);
    }
}

async function extractRFP(text) {
    const prompt = `
        Analyze the following Request for Proposal (RFP) text and extract the key requirements, budget, timeline, and item details.
        
        **RFP Text:**
        ${text}

        **Instructions:**
        1. Extract all specified fields and items.
        2. Ensure the output strictly follows the required JSON schema.
    `;
    // Calls the AI to generate the structured RFP object
    return generateStructuredJson(prompt, rfpSchema);
}

async function extractProposal(rfpStructured, proposalText) {
    const prompt = `
        Analyze the following vendor proposal text and extract structured data points.

        **Original RFP Requirements (for context and item matching):**
        ${JSON.stringify(rfpStructured, null, 2)}
        
        **Vendor Proposal Text (Extract data from here):**
        ${proposalText}

        **Instructions:**
        1. Extract the fields defined in the schema (grand_total, currency, shipping_days, etc.).
        2. Create a detailed 'items' array, ensuring accurate matching and data extraction based on the proposal text.
        3. Output the result ONLY as a JSON object matching the requested schema.
    `;
    return generateStructuredJson(prompt, proposalSchema);
}

async function compareProposals(rfpStructured, proposals, detailed = false) {
    const proposalData = proposals.map(p => ({
        id: p.id,
        vendor_name: p.vendor_name,
        proposal_data: p.proposal
    }));

    const prompt = `
        Compare all provided vendor proposals against the original RFP requirements.
        
        **Original RFP Requirements:**
        ${JSON.stringify(rfpStructured, null, 2)}
        
        **Vendor Proposals (Structured Data):**
        ${JSON.stringify(proposalData, null, 2)}

        **Instructions:**
        1. Evaluate each proposal based on compliance with RFP requirements (e.g., item specs, warranty, delivery time) and overall value (price). Lower price and faster delivery are preferred. Full compliance (specs, warranty) is mandatory for a high score.
        2. Generate a 'ranked' list of vendors from best to worst.
        3. Generate detailed 'proposal_scores' using the provided Proposal ID (p.id) for mapping back to the database.
        4. Provide a detailed 'explanation_text' summary.
        5. Create a simple, clear Markdown 'comparative_table'.
        6. Output the result ONLY as a JSON object matching the requested comparison schema.
    `;

    // System instruction added for clear role definition and scoring criteria
    const systemInstruction = `You are an expert procurement analyst. Your primary goal is to provide a neutral, structured comparison of vendor proposals against a defined RFP. Prioritize compliance and value for money.`;

    try {
        const parsedResult = await generateStructuredJson(prompt, comparisonSchema, systemInstruction);

        // Map the AI output keys to the keys expected by the application
        return {
            ranked: parsedResult.ranked || [], 
            proposal_scores: parsedResult.proposal_scores || [], 
            explanation_text: parsedResult.explanation_text || 'AI evaluation result missing summary.',
            comparative_table: parsedResult.comparative_table || '' 
        };

    } catch (error) {
        console.error("AI Proposal Comparison Failed:", error.message);
        // Return the minimum required structure to prevent a crash
        throw new Error("AI failed to perform comparison or return structured scores. Please check API key and logs for details.");
    }
}

module.exports = {
    extractRFP,
    extractProposal,
    compareProposals
};