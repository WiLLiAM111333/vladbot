import { Strike } from "../../db/models/Strike";
import { FuckYou } from "../mongo/FuckYou";
import { IStrike } from "./IStrike";
import { StrikeConfigManager } from "./StrikeConfigManager";

export class StrikeManager {
  private strikeConfigManager: StrikeConfigManager;

  public constructor () {
    this.strikeConfigManager = new StrikeConfigManager();
  }

  public async getAll(data: Optional<IStrike>): Promise<Array<FuckYou<IStrike>>> {
    try {
      return await Strike.find(data);
    } catch (err) {
      throw err;
    }
  }

  public async delete(data: Optional<IStrike>): Promise<void> {
    try {
      await Strike.deleteOne(data);
    } catch (err) {
      throw err;
    }
  }

  public async addStrike(data: Omit<IStrike, 'expireDate'>) {
    try {
      const cfg = await this.strikeConfigManager.get(data.guildID);

      const duration: number = cfg?.expireDuration
        ? cfg.expireDuration
        : 3

      return await (new Strike({
        ...data,
        expireDate: Date.now() + duration * 1000 * 60 * 60 * 24 * 31
      })).save();
    } catch (err) {
      throw err;
    }
  }

  public strikeIsExpired(strike: IStrike): boolean {
    return strike.expireDate <= Date.now();
  }
}
