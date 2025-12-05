const { DataTypes, Model } = require('sequelize');
const sequelize = require('./db'); 
const db = {};

// Note: Define all models and assign them to the 'db' object.
db.User = sequelize.define('user', { 
    userId: { type: DataTypes.INTEGER, allowNull: true },
    title: DataTypes.STRING, 
    description: DataTypes.TEXT,
    structured: DataTypes.JSON,
}, { timestamps: false, tableName: 'users' });

db.RFP = sequelize.define('rfp', { 
    userId: { type: DataTypes.INTEGER, allowNull: true },
    title: DataTypes.STRING, 
    description: DataTypes.TEXT,
    structured: DataTypes.JSON,
    budget: DataTypes.DECIMAL(14,2),
    currency: DataTypes.STRING,
    payment_terms: DataTypes.STRING,
    warranty_requirements: DataTypes.INTEGER
}, { timestamps: false, tableName: 'rfps' });

db.RFPItem = sequelize.define('rfp_item', { 
    rfpId: { type: DataTypes.INTEGER, allowNull: false },
    item_name: DataTypes.STRING, 
    quantity: DataTypes.INTEGER,
    unit: DataTypes.STRING,
    specifications: DataTypes.JSON
}, { timestamps: false, tableName: 'rfp_items' });

db.Vendor = sequelize.define('vendor', { 
    vendor_name: DataTypes.STRING,
    email: DataTypes.STRING,
}, { timestamps: false, tableName: 'vendors' });

db.RFPVendor = sequelize.define('rfp_vendor', { 
    rfpId: { type: DataTypes.INTEGER, allowNull: false },
    vendorId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'sent' },
    sent_at: DataTypes.DATE
}, { timestamps: false, tableName: 'rfp_vendors' });

db.VendorResponse = sequelize.define('vendor_response', { 
    vendorId: { type: DataTypes.INTEGER, allowNull: false },
    rfpId: { type: DataTypes.INTEGER, allowNull: false },
    email_subject: DataTypes.STRING,
    email_body: DataTypes.TEXT,
    message_id: DataTypes.STRING,
    in_reply_to: DataTypes.STRING,
}, { timestamps: false, tableName: 'vendor_responses' });

db.Proposal = sequelize.define('proposal', { 
    vendorResponseId: { type: DataTypes.INTEGER, allowNull: true }, 
    vendorId: { type: DataTypes.INTEGER, allowNull: false },
    rfpId: { type: DataTypes.INTEGER, allowNull: false },
    structured_json: DataTypes.JSON,
    total_price: DataTypes.DECIMAL(14,2),
    delivery_days: DataTypes.INTEGER,
    payment_terms: DataTypes.STRING,
    warranty_months: DataTypes.INTEGER,
    currency: DataTypes.STRING,
    completeness_score: DataTypes.DECIMAL(5,2),
    score: DataTypes.DECIMAL(5,2),
    summary: DataTypes.TEXT
}, { timestamps: false, tableName: 'proposals' });

db.Attachment = sequelize.define('attachment', { /* ... fields ... */ }, { timestamps: false, tableName: 'attachments' });

function applyAssociations(models) {
    console.log("Applying associations...");
    
    // User <-> RFP
    models.User.hasMany(models.RFP, { foreignKey: 'userId', as: 'rfps' });
    models.RFP.belongsTo(models.User, { foreignKey: 'userId' });

    // RFP <-> RFPItem
    models.RFP.hasMany(models.RFPItem, { foreignKey: 'rfpId', as: 'items' }); 
    models.RFPItem.belongsTo(models.RFP, { foreignKey: 'rfpId' });

    // Vendor <-> RFPVendor <-> RFP
    models.Vendor.hasMany(models.RFPVendor, { foreignKey: 'vendorId', as: 'rfp_status' });
    models.RFP.hasMany(models.RFPVendor, { foreignKey: 'rfpId', as: 'sent_to' });
    models.RFPVendor.belongsTo(models.Vendor, { foreignKey: 'vendorId' });
    models.RFPVendor.belongsTo(models.RFP, { foreignKey: 'rfpId' });
    
    // Proposal <-> Vendor (CRITICAL ASSOCIATION)
    models.Vendor.hasMany(models.Proposal, { foreignKey: 'vendorId', as: 'proposals' });
    models.Proposal.belongsTo(models.Vendor, { foreignKey: 'vendorId', as: 'vendor' }); 

    // Proposal <-> RFP
    models.RFP.hasMany(models.Proposal, { foreignKey: 'rfpId', as: 'proposals' });
    models.Proposal.belongsTo(models.RFP, { foreignKey: 'rfpId' });

    // VendorResponse <-> Proposal (One-to-One)
    models.VendorResponse.hasOne(models.Proposal, { foreignKey: 'vendorResponseId', as: 'proposal' });
    models.Proposal.belongsTo(models.VendorResponse, { foreignKey: 'vendorResponseId' }); 
    
    // VendorResponse associations
    models.Vendor.hasMany(models.VendorResponse, { foreignKey: 'vendorId', as: 'responses' });
    models.RFP.hasMany(models.VendorResponse, { foreignKey: 'rfpId', as: 'responses' });
    models.VendorResponse.belongsTo(models.Vendor, { foreignKey: 'vendorId' }); 
    models.VendorResponse.belongsTo(models.RFP, { foreignKey: 'rfpId' });

    const isAssociated = !!models.Proposal.associations.vendor;

    console.log(`\tAssociation check *inside* applyAssociations: Proposal -> Vendor (via 'vendor' alias): ${isAssociated}`);
    
    return models; 
}

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

// Export everything needed by server.js
module.exports = {
    sequelize,
    applyAssociations,
    ...db 
};