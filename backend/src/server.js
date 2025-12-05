const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Load the entire models module (definitions and association function)
const db = require('./models');
const { sequelize, applyAssociations, ...models } = db;

// 2. Apply Associations now, before loading routes
const associatedModels = applyAssociations(models); 
console.log(`CRITICAL CHECK: Proposal knows its Vendor association: ${!!associatedModels.Proposal.associations.vendor}`);

// 3. Load routes, passing the fully associated models object
// This function-wrapping pattern breaks the circular dependency loop.
const rfpRoutes = require('./routes/rfpRoutes')(associatedModels);
const vendorRoutes = require('./routes/vendorRoutes')(associatedModels);
const emailRoutes = require('./routes/emailRoutes')(associatedModels);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/rfps', rfpRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/email', emailRoutes); 

// Database Sync and Server Start
async function start() {
    try {
        await sequelize.authenticate(); // Check connection before sync
        console.log("DB connected");

        // Use force: true ONLY when necessary to reset the DB structure
        await sequelize.sync({ force: false }); 

        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    } catch (err) {
        console.error("Server startup error:", err);
    }
}

start();