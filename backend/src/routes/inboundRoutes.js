// routes/emailRoutes.js (Corrected Version)

const express = require('express');
const router = express.Router();

module.exports = (models) => {
  
    const aiService = require('../services/aiService');
    const scoring = require('../services/scoringService');

    // Destructure models received from server.js
    const { Vendor, RFP, VendorResponse, Proposal, RFPVendor } = models; // Added RFPVendor for completeness

    // accept sample inbound JSON: { from, subject, body, message_id, in_reply_to }
    router.post('/inbound', async (req, res) => {
        try {
            const { from, subject, body, message_id, in_reply_to } = req.body;
            
            // Normalize email to prevent lookup errors
            const normalizedFrom = from.toLowerCase();

            const vendor = await Vendor.findOne({ where: { email: normalizedFrom }});
            const m = subject ? subject.match(/RFPID:(\d+)/i) : null; // Added /i for case-insensitivity
            const rfpId = m ? parseInt(m[1], 10) : null;
            const vendorId = vendor ? vendor.id : null;

            if (!vendor || !rfpId) {
                console.warn(`[INBOUND] Failed: Vendor not found (${from}) or RFP ID missing.`);
                return res.status(400).json({ error: 'Vendor or RFP ID is missing.' });
            }

            const vr = await VendorResponse.create({ vendorId, rfpId, email_subject: subject, email_body: body, message_id, in_reply_to });
            
            const parsed = await aiService.extractProposal(body, ''); 
            
            // compute deterministic score (need rfp structured)
            const rfp = await RFP.findByPk(rfpId); // Fetch RFP based on extracted ID
            const det = scoring.computeDeterministicScore(rfp?.structured || {}, parsed || {});
            
            // create proposal
            const proposal = await Proposal.create({
                vendorResponseId: vr.id,
                vendorId,
                rfpId,
                structured_json: parsed,
                total_price: parsed?.grand_total || null,
                delivery_days: parsed?.shipping_days || null,
                payment_terms: parsed?.payment_terms || null,
                warranty_months: parsed?.warranty_months || (parsed?.line_items?.[0]?.warranty_months) || null, 
                completeness_score: parsed?.completeness || null,
                score: det.score
            });
            const rfpVendorRecord = await RFPVendor.findOne({ 
                where: { rfpId: rfpId, vendorId: vendorId }
            });
            if (rfpVendorRecord) {
                rfpVendorRecord.status = 'responded';
                await rfpVendorRecord.save();
            }

            // optional LLM polish
            const llm = await aiService.compareProposals(rfp?.structured || {}, [parsed], [det]);
            if (llm?.explanation_text) {
                proposal.summary = llm.explanation_text;
                await proposal.save();
            }

            res.json({ ok: true, proposalId: proposal.id });
        } catch (err) {
            console.error("Inbound Processing Error:", err);
            res.status(500).json({ error: 'Inbound processing failed', details: err.message });
        }
    });

    return router;
};