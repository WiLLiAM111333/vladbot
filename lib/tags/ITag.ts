import { Snowflake } from "discord.js";

export interface ITag {
  guildID: Snowflake;
  tag: string;
  text: string;
}
