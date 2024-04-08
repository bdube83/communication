const uniqueValidator = require('mongoose-unique-validator')

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
      sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
      },
      messageType: {
          type: String,
          enum: ['text', 'location'],
          required: true
      },
      content: {
          type: String,
          trim: true,
          required: true,
          maxlength: [500, 'A street chat must be at most 500 characters.'],
      },
      location: {
          type: {
              type: String,
              enum: ['Point'],
              default: 'Point'
          },
          coordinates: {
              type: [Number],
              required: [true, 'A location spot must have latitude and longitude values'],
              validate: [twoDimentionalcoordinates, 'Coordinates should contain lat and long values separated by a comma']
          },
      },
  },
  {
    timestamps: true
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

chatSchema.index({location: '2dsphere'})


function twoDimentionalcoordinates(val){
  return val.length === 2
}


chatSchema.plugin(uniqueValidator);
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
