async function getProposalsForRfp(rfpId, db) {
  const [rows] = await db.query(
    `SELECT p.id AS proposalId, v.id AS vendorId, v.vendor_name, v.email, p.structured_json
     FROM vendors v
     JOIN proposals p ON v.id = p.vendorid
     WHERE p.rfpid = ?`, // Use p.rfpid
    [rfpId]
  );

  return rows.map(r => ({
    proposalId: r.proposalId,
    score: r.score,

    Vendor: { 
      id: r.vendorId,
      vendor_name: r.vendor_name,
      email: r.email,
    },
    
    structured_json: JSON.parse(r.structured_json) 
  }));
}

module.exports = { getProposalsForRfp };