import { Awaitable, Sticker } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'stickerCreate'> {
  public constructor() {
    super('stickerCreate');
  }

  public callback(client: VladimirClient, sticker: Sticker): Awaitable<void> {
    client.moderationLogger.handleStickerCreate(sticker);
  }
}
