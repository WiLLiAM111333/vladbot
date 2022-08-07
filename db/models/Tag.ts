import { Schema, model } from 'mongoose';

export const Tag = model('tags', new Schema({
  guildID: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  }
}));
