const Chat = require('./../models/chatModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Connection = require("../models/connectionModel");
const User = require("../models/userModel");

/**
 * Get chats between two users.
 */
const getChatByUsers = catchAsync(async (req, res, next) => {
  const { recipient, sender } = req.params;

  const chats = await Chat.find({
    $or: [
      { recipient, sender },
      { recipient: sender, sender: recipient }
    ]
  });
  res.status(200).json({
    status: 'success',
    data: { chats }
  });
});

/**
 * Create a new chat between two users.
 */
const createChatByUsers = catchAsync(async (req, res, next) => {
  try {
    const { recipient, sender } = req.params;

    // Check if a connection exists between the users
    const existingConnection = await Connection.findOne({
      $or: [
        {user1: recipient, user2: sender},
        {user1: sender, user2: recipient}
      ]
    });
    if (!existingConnection) {
      return res.status(400).json({message: 'Users are not connected'});
    }

    const data = { possibleCommonSpots: [] }

    if (req.body.messageType === 'location') {
      const lat = req.body.location.coordinates[0];
      const lng = req.body.location.coordinates[1];
      const response = await fetch(`http://localhost:3000/api/v1/commonspots/near/${lat}/${lng}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization,
        },
      });
      const commonSpots = await response.json();
      if (commonSpots.data && commonSpots.data.possibleCommonSpots !== null) {
        data.possibleCommonSpots = commonSpots.data.possibleCommonSpots;
        req.body.possibleCommonSpots = data.possibleCommonSpots;
      }
    } else {
      req.body.location = { coordinates: [0, 0] }; // Null Island
    }
    const senderName = (await User.findOne({_id: {$in: sender}})).name;
    const recipientName = (await User.findOne({_id: {$in: recipient}})).name;

    const chat = await Chat.create({sender, recipient, senderName, recipientName, ...req.body});

    res.status(200).json({
      status: 'success',
      data: {chat}
    });
  } catch (err) {
    res.status(500).json({
      status: 'failed',
      data: 'An internal error occurred.'
    });
  }
});

/**
 * Delete chat between two users.
 */
const deleteChatByUsers = catchAsync(async (req, res, next) => {
  const { sender, recipient } = req.params;

  const deletedChat = await Chat.deleteMany({ sender, recipient });

  if (!deletedChat || deletedChat.deletedCount === 0) {
    return next(new AppError(`No chat available for sender: ${sender} and recipient: ${recipient}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: { deletedCount: deletedChat.deletedCount }
  });
});

module.exports = {
  getChatByUsers,
  createChatByUsers,
  deleteChatByUsers
};
