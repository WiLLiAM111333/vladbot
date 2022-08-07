import { ModerationLoggerConfig } from '../../../db/models/ModerationLoggerConfig';
import { IModerationLoggerConfig } from "./IModerationLoggerConfig";
import { Snowflake } from "discord.js";
import { FuckYou } from '../../mongo/FuckYou';

export class ModerationLoggerConfigManager {
  public async create({ guildID, logChannelID, modRoleID }: Optional<IModerationLoggerConfig>): Promise<void> {
    try {
      const cfg = new ModerationLoggerConfig({ guildID, logChannelID, modRoleID });

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
        const oldValue = old[key];
        const newValue = data[key];

        if(newValue && newValue !== oldValue) {
          //! Do not re-assign oldValue as it does not change the object.
          obj[key] = newValue;
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

  public async get(guildID: Snowflake): Promise<FuckYou<IModerationLoggerConfig>> {
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
