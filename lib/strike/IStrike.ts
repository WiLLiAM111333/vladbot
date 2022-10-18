import { Snowflake } from "discord.js";

export interface IStrike {
  guildID: Snowflake;
  userID: Snowflake;
  reason: string;
  expireDate: number;
}
