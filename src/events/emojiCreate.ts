import { Awaitable, GuildEmoji } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'emojiCreate'> {
  public constructor() {
    super('emojiCreate');
  }

  public callback(client: VladimirClient, emote: GuildEmoji): Awaitable<void> {
    client.moderationLogger.handleEmojiCreate(emote);
  }
}

