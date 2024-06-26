const express = require('express');
const chatController = require('./../controllers/chatController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect)

router.route('/:sender/:recipient')
    .get(
      chatController.getChatByUsers)
    .post(
        //authController.restrictTo(constants.USER_ROLES.ADMIN, constants.USER_ROLES.USER),
        chatController.createChatByUsers)
    .delete(
        //authController.restrictTo(constants.USER_ROLES.ADMIN),
        chatController.deleteChatByUsers)

module.exports = router;
