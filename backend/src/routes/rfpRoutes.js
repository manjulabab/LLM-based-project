const express = require('express');
const router = express.Router();
module.exports = (models) => {
    
    const aiService = require('../services/aiService');
    const emailService = require('../services/emailService');
    const { RFP, RFPItem, Vendor, RFPVendor, Proposal, VendorResponse } = models;

    /**
     * Helper function to extract RFP ID from subject (e.g., "[RFPID:48]")
     */
    const extractRfpId = (subject) => {
        const match = subject ? subject.match(/\[RFPID:(\d+)\]/) : null;
        return match ? parseInt(match[1], 10) : null;
    };
    
    /**
     * Helper function to find or create a vendor based on email
     */
    const findOrCreateVendor = async (email) => {
        let vendor = await Vendor.findOne({ where: { email } });
        if (!vendor) {
            // Basic extraction of vendor name (e.g., globalsupplies@vendor.com -> GlobalSupplies)
            const parts = email.split('@')[0].split('.');
            const name = parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
            vendor = await Vendor.create({ vendor_name: name, email });
            console.log(`DEBUG: Created new Vendor: ${vendor.vendor_name} (ID: ${vendor.id})`);
        }
        return vendor;
    };

    // --- CREATE RFP -------------------
    router.post('/', async (req, res) => {
        try {
            const { text } = req.body;

            // Assuming aiService.extractRFP handles the Gemini API call internally
            const structured = await aiService.extractRFP(text); 
            const title = structured?.items?.[0]?.name ? `RFP: ${structured.items[0].name}` : text.slice(0, 80);

            const rfp = await RFP.create({
                title,
                description: text,
                structured: JSON.stringify(structured), // Store structured object as string
                budget: structured?.total_budget || null,
                currency: structured?.currency || null,
                payment_terms: structured?.payment_terms || null,
                warranty_requirements: structured?.warranty_months || null
            });

            if (structured?.items) {
                for (const it of structured.items) {
                    await RFPItem.create({
                        rfpId: rfp.id,
                        item_name: it.name,
                        quantity: it.qty || 1,
                        unit: it.unit || 'each',
                        // Note: Storing specifications as string or JSON object depending on your model definition
                        specifications: typeof it.specs === 'object' ? JSON.stringify(it.specs) : it.specs || '' 
                    });
                }
            }

            res.json(rfp);
        } catch (err) {
            console.error("RFP Create Error:", err);
            res.status(500).json({ error: 'RFP creation failed' });
        }
    });

    // --- GET RFP -------------------
    router.get('/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10); 
            
            const rfp = await RFP.findByPk(id, {
                include: [{ model: RFPItem, as: 'items' }] 
            });
            
            if (!rfp) return res.status(404).json({ error: 'RFP not found' });
            
            res.json(rfp.toJSON()); 
        } catch (err) {
            console.error("RFP Get Error:", err);
            res.status(500).json({ error: 'Failed to retrieve RFP' });
        }
    });

    // --- SEND RFP TO VENDORS -------------------
    router.post('/:id/send', async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10); 
            const { vendorIds, emailTemplate } = req.body;

            const rfp = await RFP.findByPk(id);
            if (!rfp) return res.status(404).json({ error: 'RFP not found' });
            
            const vendors = await Vendor.findAll({ where: { id: vendorIds } });

            const results = [];
            for (const v of vendors) {
                const subject = `RFP: ${rfp.title} [RFPID:${rfp.id}]`;
                const body = emailTemplate || `Please review the RFP below and reply with your proposal.\n\n${rfp.description}`;
                await emailService.sendRfpEmail(v.email, subject, body);

                await RFPVendor.findOrCreate({
                    where: { rfpId: rfp.id, vendorId: v.id },
                    defaults: { sent_at: new Date(), status: 'sent' }
                });

                results.push({ vendorId: v.id, email: v.email, status: 'sent' });
            }

            res.json({ results });
        } catch (err) {
            console.error("RFP Send Error:", err);
            res.status(500).json({ error: 'Send failed' });
        }
    });

    router.post('/proposals', async (req, res) => {
        try {
            const { from, subject, body, message_id } = req.body;
            console.log(`[INBOUND PROPOSAL] Received email from: ${from}`);

            const rfpId = extractRfpId(subject);
            if (!rfpId) {
                return res.status(400).json({ error: 'Invalid or missing RFP ID in subject line.' });
            }

            // 1. Find the RFP
            const rfp = await RFP.findByPk(rfpId);
            if (!rfp) {
                return res.status(404).json({ error: `RFP with ID ${rfpId} not found.` });
            }
            const rfpStructured = JSON.parse(rfp.structured); // Ensure structured RFP is a usable object

            // 2. Find or Create the Vendor by email
            const vendorEmail = from;
            const vendor = await findOrCreateVendor(vendorEmail);

            // 3. Record the raw response in VendorResponse
            const vendorResponse = await VendorResponse.create({
                rfpId,
                vendorId: vendor.id,
                email_body: body,
                message_id,
                received_at: new Date(),
            });


            // 4. Use AI to extract structured data from the raw proposal body
            const structuredProposal = await aiService.extractProposal(rfpStructured, body);
            
            // Check if structuredProposal is valid before proceeding
            if (!structuredProposal || typeof structuredProposal.grand_total === 'undefined') {
                return res.status(500).json({ error: 'AI failed to extract structured proposal data.' });
            }

            // 5. Create/Update the Proposal record
            const [proposal, created] = await Proposal.findOrCreate({
                where: { rfpId: rfpId, vendorId: vendor.id },
                defaults: {
                    vendorResponseId: vendorResponse.id,
                    raw_text: body,
                    structured_json: structuredProposal,
                    received_at: new Date(),
                    message_id: message_id,
                    // Use extracted data directly for main fields
                    total_price: structuredProposal.grand_total,
                    delivery_days: structuredProposal.shipping_days,
                    payment_terms: structuredProposal.payment_terms,
                    warranty_months: structuredProposal.warranty_months,
                    currency: structuredProposal.currency,
                }
            });

            if (!created) {
                // If proposal already exists, update it (e.g., if vendor sent a revision)
                await proposal.update({
                    vendorResponseId: vendorResponse.id,
                    raw_text: body,
                    structured_json: structuredProposal,
                    received_at: new Date(),
                    message_id: message_id,
                    total_price: structuredProposal.grand_total,
                    delivery_days: structuredProposal.shipping_days,
                    payment_terms: structuredProposal.payment_terms,
                    warranty_months: structuredProposal.warranty_months,
                    currency: structuredProposal.currency,
                    // Reset scores on revision so evaluation is re-run
                    completeness_score: 0.00,
                    score: 0.00,
                    summary: 'Revision received, pending AI evaluation.',
                });
            }

            // 6. Update RFPVendor status if necessary (to 'received')
            await RFPVendor.update(
                { status: 'received' },
                { where: { rfpId: rfpId, vendorId: vendor.id } }
            );

            res.status(created ? 201 : 200).json({ 
                message: `Proposal from ${vendor.vendor_name} ${created ? 'created' : 'updated'} successfully.`, 
                proposal: proposal.toJSON() 
            });

        } catch (err) {
            console.error("Proposal Ingestion Error:", err);
            res.status(500).json({ error: 'Proposal ingestion failed', details: err.message });
        }
    });

    // --- GET EVALUATION RESULTS (Load Saved Data) -------------------
    router.get('/:id/evaluate', async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            console.log(`DEBUG: GET /evaluate - Processing RFP ID: ${id}`);
            
            const rfp = await RFP.findByPk(id);
            if (!rfp) return res.status(404).json({ error: 'RFP not found' });

            let proposalsRecords = await Proposal.findAll({
                where: { rfpId: id },
                include: [
                    { 
                        model: Vendor, 
                        as: 'vendor', 
                        attributes: ['id', 'vendor_name', 'email'] 
                    } 
                ],
                order: [['score', 'DESC']]
            });
            
            proposalsRecords = proposalsRecords.filter(p => p.vendor); 

            if (!proposalsRecords.length) {
                const vendorsSent = await RFPVendor.findAll({
                    where: { rfpId: id },
                    include: [{ model: Vendor, attributes: ['id', 'vendor_name'] }]
                });
                
                const validVendorsSent = vendorsSent
                    .filter(rv => rv.Vendor)
                    .map(rv => rv.Vendor);
                
                console.log(`DEBUG: GET /evaluate - No valid proposals found. Returning vendor list size: ${validVendorsSent.length}`);
                
                return res.status(200).json({ 
                    message: 'No proposals received yet.',
                    rfp: rfp, 
                    proposals: [],
                    vendors: validVendorsSent 
                });
            }
            
            const topProposal = proposalsRecords[0]; // Already sorted by score DESC

            res.json({
                message: 'Evaluation results loaded from database.',
                rfp: rfp,
                proposals: proposalsRecords.map(p => p.toJSON()),
                ranked: proposalsRecords.map(p => ({
                    vendor_id: p.vendor.id,
                    vendor_name: p.vendor.vendor_name,
                    score: p.score,
                    reason: p.summary // Using summary as the reason for ranking
                })),
                explanation_text: topProposal.summary || 'Summary pending.',
                comparative_table: 'Comparative table regeneration is typically done at the client or via POST /evaluate.',
                topVendor: topProposal.vendor ? { vendor_id: topProposal.vendor.id, vendor_name: topProposal.vendor.vendor_name, score: topProposal.score, reason: topProposal.summary } : null
            });
        } catch (err) {
            console.error("GET Evaluation Load Error:", err);
            res.status(500).json({ error: 'Failed to load existing evaluation data.', details: err.message });
        }
    });

    // --- EVALUATE PROPOSALS (Run AI Analysis) -------------------
    router.post('/:id/evaluate', async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            console.log(`DEBUG: POST /evaluate - Starting evaluation for RFP ID: ${id}`);

            const rfp = await RFP.findByPk(id);
            if (!rfp) return res.status(404).json({ error: 'RFP not found' });
            const rfpStructured = JSON.parse(rfp.structured); // Ensure structured RFP is a usable object

            const proposalsRecords = await Proposal.findAll({
                where: { rfpId: id },
                include: [
                    { 
                        model: Vendor, 
                        as: 'vendor', 
                        attributes: ['id', 'vendor_name', 'email'] 
                    } 
                ]
            });
            
            console.log(`DEBUG: POST /evaluate - Proposals found before filtering: ${proposalsRecords.length}`);

            if (!proposalsRecords.length) {
                // If no proposals are found, check which vendors were sent the RFP
                const vendorsSent = await RFPVendor.findAll({
                    where: { rfpId: id },
                    include: [{ model: Vendor, attributes: ['id', 'vendor_name'] }]
                });
                
                const validVendorsSent = vendorsSent
                    .filter(rv => rv.Vendor)
                    .map(rv => rv.Vendor);
                
                console.log(`DEBUG: POST /evaluate - No proposal records found. Returning vendor list size: ${validVendorsSent.length}`);

                return res.status(200).json({ 
                    message: 'No proposals received yet. Cannot run AI evaluation.',
                    rfp: rfp, 
                    proposals: [],
                    vendors: validVendorsSent 
                });
            }
            
            // Prepare proposals array for AI evaluation, filtering out records with missing vendors
            const proposals = proposalsRecords
                .filter(p => p.vendor) // Ensure vendor data exists
                .map(p => ({
                    vendor_id: p.vendor.id, 
                    vendor_name: p.vendor.vendor_name, 
                    email: p.vendor.email, 
                    proposal: p.structured_json, 
                    score: p.score,
                    id: p.id // Proposal ID is crucial for mapping results back
                }));
                
            console.log(`DEBUG: POST /evaluate - Proposals remaining after Vendor filter: ${proposals.length}`);
            
            if (!proposals.length) {
                return res.status(500).json({ error: 'Proposals found, but associated vendor data is missing for all. Check database integrity.' });
            }

            // AI evaluation step
            const rankedResult = await aiService.compareProposals(rfpStructured, proposals, true);
            
            const topVendor = rankedResult.ranked?.[0]; 
            // Ensure scores are returned by the AI service
            if (!topVendor || !rankedResult.proposal_scores) { 
                console.error("DEBUG: AI comparison failed to return a top vendor or scores.");
                return res.status(500).json({ error: 'AI failed to rank proposals or return scores. Check aiService implementation.' });
            }
            
            // --- Update Database with AI Scores ---
            console.log("Updating database with AI scores...");

            const updatePromises = rankedResult.proposal_scores.map(scoreData => {
                const proposalRecord = proposalsRecords.find(p => p.id === scoreData.id);
                
                if (proposalRecord) {
                    return proposalRecord.update({
                        completeness_score: scoreData.completeness_score,
                        score: scoreData.final_score, // Assuming final_score is the main score
                        summary: scoreData.summary,
                    });
                }
                return Promise.resolve(); // If no match, resolve the promise immediately
            });

            await Promise.all(updatePromises);
            console.log("Database update complete.");

            // Re-fetch updated records for the final response to include new scores, sorted by score
            const finalProposals = await Proposal.findAll({
                where: { rfpId: id },
                include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'vendor_name', 'email'] }],
                order: [['score', 'DESC']]
            });
            
            res.json({ 
                message: rankedResult.explanation_text || 'Evaluation complete.', 
                rfp: rfp,
                proposals: finalProposals.map(p => p.toJSON()), 
                ranked: rankedResult.ranked,
                explanation_text: rankedResult.explanation_text,
                comparative_table: rankedResult.comparative_table,
                topVendor: topVendor 
            });
        } catch (err) {
            console.error("Evaluation Error:", err);
            res.status(500).json({ error: 'Evaluation failed', details: err.message });
        }
    });

    return router;
};