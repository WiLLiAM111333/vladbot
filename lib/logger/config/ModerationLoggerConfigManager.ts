import { ModerationLoggerConfig } from '../../../db/models/ModerationLoggerConfig';
import { IModerationLoggerConfig } from "./IModerationLoggerConfig";
import { Snowflake } from "discord.js";

export class ModerationLoggerConfigManager {
  public async add({ guildID, logChannelID, modRoleIDs }: IModerationLoggerConfig): Promise<void> {
    try {
      const cfg = new ModerationLoggerConfig({ guildID, logChannelID, modRoleIDs });

      await cfg.save();
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async update(data: Optional<IModerationLoggerConfig>): Promise<void> {
    try {
      const { guildID } = data;

      const old = await ModerationLoggerConfig.findOne({ guildID });
      const obj = { guildID }

      for(const key in old) {
        if(data[key] && data[key] !== old[key]) {
          obj[key] = data[key];
        }
      }

      await ModerationLoggerConfig.updateOne(obj);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async has(guildID: Snowflake): Promise<boolean> {
    try {
      return !!(await ModerationLoggerConfig.findOne({ guildID }))
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async get(guildID: Snowflake): Promise<IModerationLoggerConfig> {
    try {
      return await ModerationLoggerConfig.findOne({ guildID });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public handleError(err: Error | unknown): never { // TODO: HANDLE ERROR
    throw err;
  }
}
