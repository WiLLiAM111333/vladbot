import { Awaitable, Sticker } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'stickerUpdate'> {
  public constructor() {
    super('stickerUpdate');
  }

  public callback(client: VladimirClient, oldSticker: Sticker, newSticker: Sticker): Awaitable<void> {
    client.moderationLogger.handleStickerUpdate(oldSticker, newSticker);
  }
}
