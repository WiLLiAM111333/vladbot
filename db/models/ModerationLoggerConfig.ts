import { Schema, model } from 'mongoose';

export const ModerationLoggerConfig = model('moderationlogger_config', new Schema({
  guildID: {
    type: String,
    required: true
  },
  logChannelID: {
    type: String,
    required: false
  },
  modRoleID: {
    type: String,
    required: false
  },
  ignoredChannelIDs: {
    type: Array,
    required: false
  }
}));
