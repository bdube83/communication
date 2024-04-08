const Chat = require('./../models/chatModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Connection = require("../models/connectionModel");

/**
 * Get chats between two users.
 */
const getChatByUsers = catchAsync(async (req, res, next) => {
  const { recipient, sender } = req.params;

  const chats = await Chat.find({ recipient, sender });

  res.status(200).json({
    status: 'success',
    data: { chats }
  });
});

/**
 * Create a new chat between two users.
 */
const createChatByUsers = catchAsync(async (req, res, next) => {
  const { recipient, sender } = req.params;

  // Check if a connection exists between the users
  const existingConnection = await Connection.findOne({
    $or: [
      { user1: recipient, user2: sender },
      { user1: sender, user2: recipient }
    ]
  });
  if (!existingConnection) {
    return res.status(400).json({ message: 'Users are not connected' });
  }

  const chat = await Chat.create({ recipient, sender, ...req.body });

  res.status(201).json({
    status: 'success',
    data: { chat }
  });
});

/**
 * Delete chat between two users.
 */
const deleteChatByUsers = catchAsync(async (req, res, next) => {
  const { recipient, sender } = req.params;

  const deletedChat = await Chat.findOneAndDelete({ recipient, sender });

  if (!deletedChat) {
    return next(new AppError(`No chat available for sender: ${sender} and recipient: ${recipient}`, 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  getChatByUsers,
  createChatByUsers,
  deleteChatByUsers
};
