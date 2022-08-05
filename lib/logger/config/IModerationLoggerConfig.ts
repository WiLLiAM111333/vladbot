import { Snowflake } from "discord.js";

export interface IModerationLoggerConfig {
  guildID: Snowflake;
  logChannelID: Snowflake;
  modRoleID: Snowflake;
  ignoredChannelIDs: Array<Snowflake>;
}
