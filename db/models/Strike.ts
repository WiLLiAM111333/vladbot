import { Schema, model } from 'mongoose';

export const Strike = model('strikes', new Schema({
  guildID: {
    type: String,
    required: true
  },
  userID: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  expireDate: {
    type: Number,
    required: true
  }
}));
