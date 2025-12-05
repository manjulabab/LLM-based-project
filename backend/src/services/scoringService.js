function computeDeterministicScore(rfpStructured, proposalData) {
    let score = 0;
    let maxScore = 4; // Max score for total price, delivery, payment, warranty

    // 1. Total Price provided
    if (proposalData.grand_total > 0) {
        score += 1;
    }

    // 2. Delivery Time check (if provided in RFP and proposal)
    if (rfpStructured.delivery_days && proposalData.shipping_days) {
        if (proposalData.shipping_days <= rfpStructured.delivery_days) {
             score += 1; // Favorable delivery
        } else {
             score += 0.5; // Unfavorable delivery
        }
    } else if (proposalData.shipping_days) {
         score += 0.5; // Delivery provided without RFP comparison
    }

    // 3. Payment terms provided
    if (proposalData.payment_terms) {
        score += 1;
    }
    
    // 4. Warranty provided
    if (proposalData.warranty_months && proposalData.warranty_months >= (rfpStructured.warranty_months || 0)) {
        score += 1; // Meets or exceeds warranty requirement
    } else if (proposalData.warranty_months) {
        score += 0.5; // Provided but less than required
    }
    
    // Convert to percentage
    const finalScore = parseFloat(((score / maxScore) * 100).toFixed(2));

    return { score: finalScore, details: { score, maxScore } };
}

module.exports = {
    computeDeterministicScore
};