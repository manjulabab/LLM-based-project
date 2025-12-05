const { getProposalsForRfp } = require('./dbService');
const aiService = require('./aiService');
const { sendRfpEmail } = require('./emailService');

async function evaluateProposalsAndNotify(rfp, db) {
  // 1. Get proposals
  const proposals = await getProposalsForRfp(rfp.id, db);

  if (proposals.length === 0) {
    console.log('No proposals found for this RFP.');
    return;
  }

  const rankedResult = await aiService.compareProposals(rfp, proposals, true);

  // 3. Send email to requester
  const topVendor = rankedResult.ranked[0];
  const comparativeText = JSON.stringify(rankedResult.comparative_table, null, 2);
  const explanation = rankedResult.explanation_text;

  const body = `
Hello ${rfp.user_name},

After evaluating all proposals for your RFP "${rfp.title}", the best vendor is:

Vendor: ${topVendor.vendor_id}  
Score: ${topVendor.score}  

Reasoning:  
${topVendor.reason}

Comparative Table of all vendors:  
${comparativeText}

Detailed explanation:  
${explanation}
`;

  await sendRfpEmail(rfp.user_email, `Best Vendor for RFP: ${rfp.title}`, body);
}

module.exports = { evaluateProposalsAndNotify };
