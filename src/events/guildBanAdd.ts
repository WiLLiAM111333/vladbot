import { Awaitable, GuildBan } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'guildBanAdd'> {
  public constructor() {
    super('guildBanAdd');
  }

  public callback(client: VladimirClient, ban: GuildBan): Awaitable<void> {
    client.moderationLogger.handleGuildBanAdd(ban);
  }
}

