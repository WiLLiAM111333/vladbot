import { Awaitable, GuildMember } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'guildMemberRemove'> {
  public constructor() {
    super('guildMemberRemove');
  }

  public callback(client: VladimirClient, member: GuildMember): Awaitable<void> {
    client.moderationLogger.handleGuildMemberRemove(member);
  }
}

