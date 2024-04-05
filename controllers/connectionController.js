const Connection = require('../models/connectionModel');
const User = require('./../models/userModel')

/**
 * Add a connection between two users.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} - The created connection.
 */
const addConnection = async (req, res) => {
    try {
        const { user1Id, user2Id } = req.body;

        // Check if both users exist
        const user1 = await User.findById(user1Id);
        const user2 = await User.findById(user2Id);
        if (!user1 || !user2) {
            return res.status(404).json({ message: 'One or both users not found' });
        }

        // Check if a connection already exists between the users
        const existingConnection = await Connection.findOne({
            $or: [
                { user1: user1Id, user2: user2Id },
                { user1: user2Id, user2: user1Id }
            ]
        });
        if (existingConnection) {
            return res.status(400).json({ message: 'Connection already exists between the users' });
        }


        // Create connection
        const connection = await Connection.create({ user1: user1Id, user2: user2Id });
        res.status(201).json({ connection });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Remove a connection between two users.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} - The success message.
 */
const removeConnection = async (req, res) => {
    try {
        const connectionId = req.params.id;
        console.log(connectionId);
        const connection = await Connection.findById(connectionId);
        if (!connection) {
            return res.status(404).json({ message: 'Connection not found' });
        }

        await Connection.findByIdAndDelete(connectionId);
        res.status(200).json({ message: 'Connection removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get a list of users connected to a specific user.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} - The list of connected users.
 */
const getConnectedUsers = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find connections involving the specified user
        const connections = await Connection.find({ $or: [{ user1: userId }, { user2: userId }] });

        // Extract user IDs from connections
        const connectedUserIds = connections.reduce((acc, curr) => {
            if (curr.user1.toString() !== userId) {
                acc.push(curr.user1);
            }
            if (curr.user2.toString() !== userId) {
                acc.push(curr.user2);
            }
            return acc;
        }, []);

        // Find user details for connected users
        const connectedUsers = await User.find({ _id: { $in: connectedUserIds } });

        res.status(200).json({ connectedUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    addConnection,
    removeConnection,
    getConnectedUsers
};
