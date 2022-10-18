import { Schema, model } from 'mongoose';

export const StrikeConfig = model('strike_config', new Schema({
  guildID: {
    type: String,
    required: true
  },
  expireDuration: {
    type: Number,
    required: false
  }
}));
