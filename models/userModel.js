const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const constants = require('./../utils/constants')

const userSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: [true, 'Name is a required field'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is a required field'],
            lowercase: true,
            unique: true,
            validate: [validator.isEmail, 'Email provided is not a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is a required field'],
            minlength: 8,
            select: false
        },
        passwordConfirm: {
            type: String,
            required: [true, 'Please confirm your password'],
            validate: {
                // This only works on save and create
                validator: function(value) {
                    return value === this.password
                },
                message: 'Passwords do not match'
            },
            select: false
        },
        township: {
            type: mongoose.Schema.ObjectId,
            ref: 'Township',
            required: [
                function() {
                    return this.role === constants.USER_ROLES.USER
                },
                'Township is a required field.'
            ]
        },
        location: {
            type: {
              type: String,
              enum: ['Point'],
            },
            coordinates: {
              type: [Number],
              required: [
                function(){
                    return this.role === constants.USER_ROLES.USER
                },
                'Please provide your location coordinates.'
              ],
              default: undefined,
              validate: [twoDimentionalcoordinates, 'Coordinates should contain lat and long values separated by a comma']
            }
          },
        contactNumber: {
            type: String,
            required: [true, 'Please provide your contact details - with no spaces between numbers.'],
            minlength: 10,
            maxlength: 12   // for +27 case
        },
        role: {
            type: String,
            lowercase: true,
            enum: Object.values(constants.USER_ROLES),
            default: constants.USER_ROLES.USER
        },
        passwordResetToken: String,
        passwordResetExpires: Date
    },
    {
        timestamps: true
    }
)

userSchema.pre('save', async function(next) {
    if(!this.isModified('password')) {
        return next()
    }

    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined

    next()
})

/**
 * This middleware method will be used to set the default for the location type value.
 * This is done here instead of in the schema to avoid saving locations that only have the type value.
 */
userSchema.pre('save', async function(next) {
    if(this.role === constants.USER_ROLES.USER){
        this.location.type = 'Point'
    }
    next()
})

// userSchema.pre(/^find/, function(next){
//     this.populate({
//         path: 'township',
//         select: '-_v'
//     })
// })


userSchema.methods.checkPassWord = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    console.log({resetToken}, this.passwordResetToken)

    return resetToken
}

function twoDimentionalcoordinates(val){
    return val.length == 2
}

const User = mongoose.model('User', userSchema)

module.exports = User
