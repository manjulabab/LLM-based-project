const express = require('express');
const router = express.Router();
module.exports = (models) => {
    
    const { Vendor } = models;

    // create vendor
    router.post('/', async (req, res) => {
        try {
            const v = await Vendor.create(req.body);
            res.json(v);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Vendor create failed' });
        }
    });

    // list vendors
    router.get('/', async (req, res) => {
        try {
            const vendors = await Vendor.findAll();
            res.json(vendors);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Vendor list failed' });
        }
    });
    return router;
};