const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const connectionController = require('../controllers/connectionController');
const constants = require('./../utils/constants')

// API endpoint to add a connection between users
router.post('/connections',
    //authController.restrictTo(constants.USER_ROLES.ADMIN, constants.USER_ROLES.USER),
    connectionController.addConnection);

// API endpoint to remove a connection between users
router.delete('/connections/:id',
    //authController.restrictTo(constants.USER_ROLES.ADMIN, constants.USER_ROLES.USER),
    connectionController.removeConnection);

// API endpoint to retrieve a list of users connected to a specific user
router.get('/:userId/connections',
    connectionController.getConnectedUsers);

module.exports = router;
