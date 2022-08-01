import { Awaitable, GuildEmoji } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'emojiDelete'> {
  public constructor() {
    super('emojiDelete');
  }

  public callback(client: VladimirClient, emote: GuildEmoji): Awaitable<void> {
    client.moderationLogger.handleEmojiDelete(emote);
  }
}

