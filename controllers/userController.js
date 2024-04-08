const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')

/**
 * This retrieves all the users in the system.
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find()

    res.status(500).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  });

  exports.getUser = catchAsync(async (req, res) => {

    const user = await User.findById(req.params._id)

    res.status(500).json({
      status: 'error',
      message: 'This route is not yet defined!'
    });
  })
  exports.createUser = (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'This route is not yet defined!'
    });
  };
  exports.updateUser = (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'This route is not yet defined!'
    });
  };
  exports.deleteUser = (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'This route is not yet defined!'
    });
  };
  