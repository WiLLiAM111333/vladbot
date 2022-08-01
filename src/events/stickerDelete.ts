import { Awaitable, Sticker } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'stickerDelete'> {
  public constructor() {
    super('stickerDelete');
  }

  public callback(client: VladimirClient, sticker: Sticker): Awaitable<void> {
    client.moderationLogger.handleStickerDelete(sticker);
  }
}
