const express = require('express');
const router = express.Router();
const crossChainController = require('../controllers/crossChainController');

router.post('/transfer', crossChainController.transferToPrimaryAddress);

module.exports = router;
