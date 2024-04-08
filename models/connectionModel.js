const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
    user1: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    user2: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
});

const Connection = mongoose.model('Connection', connectionSchema);

module.exports = Connection;
