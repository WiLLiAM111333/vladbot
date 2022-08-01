import { Awaitable, GuildMember } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'guildMemberUpdate'> {
  public constructor() {
    super('guildMemberUpdate');
  }

  public callback(client: VladimirClient, oldMember: GuildMember, newMember: GuildMember): Awaitable<void> {
    client.moderationLogger.handleGuildMemberUpdate(oldMember, newMember);
  }
}

