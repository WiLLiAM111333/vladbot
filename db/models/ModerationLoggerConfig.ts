import { Schema, model } from 'mongoose';

export const ModerationLoggerConfig = model('moderationlogger_config', new Schema({
  guildID: {
    type: String,
    required: true
  },
  logChannelID: {
    type: String,
    required: true
  },
  modRoleIDs: {
    type: Array,
    required: true
  }
}));
