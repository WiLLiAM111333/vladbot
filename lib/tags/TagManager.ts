import { Snowflake } from 'discord.js';
import { Tag } from '../../db/models/Tag';
import { FuckYou } from '../mongo/FuckYou';
import { ITag } from './ITag';

export class TagManager {
  public async create(data: Optional<ITag>): Promise<void> {
    try {
      const cfg = new Tag(data);

      await cfg.save();
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async update(data: Optional<ITag>): Promise<void> {
    try {
      const { guildID } = data;

      const old = await Tag.findOne({ guildID });
      const obj = { guildID }

      for(const key in old) {
        const oldValue = old[key];
        const newValue = data[key];

        if(newValue && newValue !== oldValue) {
          //! Do not re-assign oldValue as it does not change the object.
          obj[key] = newValue;
        }
      }

      await Tag.updateOne(obj);
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async has(guildID: Snowflake, tag: string): Promise<boolean> {
    try {
      return !!(await Tag.findOne({ guildID, tag }))
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async get(guildID: Snowflake, tag: string): Promise<FuckYou<ITag>> {
    try {
      return await Tag.findOne({ guildID, tag });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public async delete(guildID: Snowflake, tag: string): Promise<void> {
    try {
      await Tag.deleteOne({ guildID, tag });
    } catch (err: unknown) {
      this.handleError(err);
    }
  }

  public handleError(err: Error | unknown): never { // TODO: HANDLE ERROR
    throw err;
  }
}
