import { Snowflake } from "discord.js";

export interface ITag {
  guildID: Snowflake;
  text: string;
}
