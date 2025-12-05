const express = require('express');
const router = express.Router();
module.exports = (models) => {
    
    const aiService = require('../services/aiService');
    const { Vendor, RFP, VendorResponse, Proposal, RFPVendor } = models;
    router.post('/inbound', async (req, res) => {
        try {
            const { from, subject, body, message_id, in_reply_to } = req.body;
            console.log(`[INBOUND] Processing email from: ${from}`);

            // 1. Extract RFP ID from Subject Line
            const m = subject ? subject.match(/RFPID:(\d+)/i) : null;
            const rfpId = m ? parseInt(m[1], 10) : null;

            if (!rfpId) {
                console.warn(`[INBOUND] Skipped: No RFP ID found in subject: "${subject}"`);
                return res.status(400).json({ error: 'RFP ID missing in subject line.' });
            }

            // 2. Fetch the RFP (Crucial for AI Context)
            const rfp = await RFP.findByPk(rfpId);
            if (!rfp) {
                return res.status(404).json({ error: `RFP ID ${rfpId} not found.` });
            }

            // 3. Find the Vendor
            // Normalize email to lower case to ensure matches work
            const normalizedFrom = from.toLowerCase();
            const vendor = await Vendor.findOne({ where: { email: normalizedFrom }});

            if (!vendor) {
                console.warn(`[INBOUND] Skipped: Unknown vendor email: ${normalizedFrom}`);
                return res.status(404).json({ error: 'Vendor not found in DB.' });
            }

            // 4. Save Raw Response
            const vr = await VendorResponse.create({ 
                vendorId: vendor.id, 
                rfpId: rfp.id, 
                email_subject: subject, 
                email_body: body, 
                message_id, 
                in_reply_to 
            });
            
            // 5. AI Parsing / Extraction
            // We must pass the RFP structure so the AI knows what to look for
            // Ensure structured is an object (parse if it's stored as a string)
            let rfpContext = rfp.structured;
            if (typeof rfpContext === 'string') {
                rfpContext = JSON.parse(rfpContext);
            }

            // Call the AI Service
            // Note: aiService.extractProposal expects (rfpStructured, proposalText)
            const parsed = await aiService.extractProposal(rfpContext, body); 
            
            // 6. Create Proposal Record
            // Map the AI extracted fields to your database columns
            const proposal = await Proposal.create({
                vendorResponseId: vr.id,
                vendorId: vendor.id,
                rfpId: rfp.id,
                structured_json: parsed,
                
                // Mapped fields from AI Schema (proposalSchema in aiService.js)
                total_price: parsed.grand_total || null,
                delivery_days: parsed.shipping_days || null,
                payment_terms: parsed.payment_terms || null,
                warranty_months: parsed.warranty_months || null,
                currency: parsed.currency || 'USD',
                
                // Scores will be calculated later by the /evaluate endpoint
                completeness_score: 0,
                score: 0 
            });
            
            // 7. Update RFPVendor status to 'responded'
            await RFPVendor.update(
                { status: 'responded' },
                { where: { rfpId: rfp.id, vendorId: vendor.id } }
            );

            console.log(`[INBOUND] Successfully created Proposal ID: ${proposal.id} for Vendor: ${vendor.vendor_name}`);
            res.json({ ok: true, proposalId: proposal.id });

        } catch (err) {
            console.error("Inbound Processing Failed:", err);
            res.status(500).json({ error: 'Inbound processing failed', details: err.message });
        }
    });

    return router;
};