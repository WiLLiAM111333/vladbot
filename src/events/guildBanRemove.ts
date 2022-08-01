import { Awaitable, GuildBan } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'guildBanRemove'> {
  public constructor() {
    super('guildBanRemove');
  }

  public callback(client: VladimirClient, ban: GuildBan): Awaitable<void> {
    client.moderationLogger.handleGuildBanRemove(ban);
  }
}

