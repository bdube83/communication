const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const sendEmail = require('./../utils/email')

const ONE_SECONDS_MILLIS = 1000

/**
 * This creates a user on the system.
 */
exports.signUp = catchAsync(async (req, res, next, isAdmin) => {
    if(req.body.role === 'admin') {
        return next(new AppError('You are not authorized to sign up as an admin user', 401))
    }
    const newUser = await User.create(req.body)
    newUser.password = undefined
    const token = signToken(newUser._id)
    res.status(201).json({
        status:'success',
        token,
        data: {
            user: newUser
        }
    })
})


/**
 * This logs in (authenticates) a user.
 */
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body
    if(!email || !password){
        return next(new AppError('Please provide an email and password', 400))
    }
    const user = await User.findOne({email: email}).select('+password')
    if(!user || !(await user.checkPassWord(password, user.password))){
        return next(new AppError('Incorrect email or password', 401))
    }
    createAndSendToken(user, res)
})


/**
 * This logs a request for user who forgot their password.
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({
        email: req.body.email
    })
    if(user){
        const resetToken = user.createPasswordResetToken()
        await user.save({ validateBeforeSave: false })
        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
        const message = `Forgot your password? submit a PATCH request with your new password and 
        passwordConfirm to:\n ${resetUrl} \nIf you didn't forget your password please ignore this email.`
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your password reset token (valid for 10 minutes)',
                message: message
            })
        } catch (error) {
            user.passResetToken = undefined
            user.passResetExpires = undefined
            await user.save({ validateBeforeSave: false })
            return next(new AppError('There was an issue with sending the email. Try again later!'))
        }
    }
    res.status(200).json({
        status:'success',
        message: `If email provided is valid a password reset email has been sent to ${user.email}`
    })
})


/**
 * This resets a password for a user who forgot their password.
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')
    console.log(hashedToken)
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    })
    if(!user){
        return next(new AppError('The password reset token is invalid or has expired', 400))
    }
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()
    createAndSendToken(user, res)
})


/**
 * This changes the password of a logged in user.
 */
exports.changePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.userLoggedIn._id).select('+password')
    const { currentPassword, newPassword, newPasswordConfirm } = req.body
    if(!(await user.checkPassWord(currentPassword, user.password))){
        return next(new AppError('Current password is incorrect', 401))
    }
    user.password = newPassword
    user.passwordConfirm = newPasswordConfirm

    await user.save()
    createAndSendToken(user, res)
})


/**
 * this creates a jwt token for a logged in user
 */
const signToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

/**
 * This is used to protect routes that require authentication.
 */
exports.protect = catchAsync(async (req, res, next) => {
    let token
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        token = req.headers.authorization.split(' ')[1]
    }
    if(!token){
        return next(new AppError('You are not logged in! please log in to get access', 401))
    }
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    const currentUser = await User.findById(decoded.id)
    if(!currentUser){
        return next(new AppError('The user beongong to the provided token no longer exists', 401))
    }
    if((currentUser.updatedAt.getTime() / 1000) > (decoded.iat + ONE_SECONDS_MILLIS)){
        return next(new AppError('The user was updated after the provided was created, create a new token (login again)!', 401))
    }
    req.userLoggedIn = currentUser
    next()
})

/**
 * This restricts the route to users with provided role permision
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.userLoggedIn.role)){
            return next(new AppError('You are not authorized to access this route', 403))
        }
        next()
    }
}

createAndSendToken = (user, res) => {
    const token = signToken(user._id)
    res.status(201).json({
        status:'success',
        token
    })
}