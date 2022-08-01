import { Awaitable, GuildEmoji } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'emojiUpdate'> {
  public constructor() {
    super('emojiUpdate');
  }

  public callback(client: VladimirClient, oldEmote: GuildEmoji, newEmote: GuildEmoji): Awaitable<void> {
    client.moderationLogger.handleEmojiUpdate(oldEmote, newEmote);
  }
}

