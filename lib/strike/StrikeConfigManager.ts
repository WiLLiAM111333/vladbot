import { Snowflake } from "discord.js";
import { StrikeConfig } from "../../db/models/StrikeConfig";
import { IStrikeConfig } from "./IStrikeConfig";

export class StrikeConfigManager {
  public async get(guildID: Snowflake): Promise<IStrikeConfig> {
    try {
      return await StrikeConfig.findOne({ guildID });
    } catch (err) {
      throw err
    }
  }

  public async update(data: Optional<IStrikeConfig>) {
    try {
      const { guildID } = data;

      const old = await StrikeConfig.findOne({ guildID });
      const obj = { guildID }

      for(const key in old) {
        const oldValue = old[key];
        const newValue = data[key];

        if(newValue && newValue !== oldValue) {
          //! Do not re-assign oldValue as it does not change the object.
          obj[key] = newValue;
        }
      }

      await StrikeConfig.updateOne(obj);
    } catch (err) {
      throw err;
    }
  }
}
