import { Awaitable, GuildChannel } from "discord.js";
import { Event } from "../../lib/event/Event";
import { VladimirClient } from "../../lib/VladimirClient";

export default class extends Event<'channelCreate'> {
  public constructor() {
    super('channelCreate');
  }

  public callback(client: VladimirClient, channel: GuildChannel): Awaitable<void> {
    if(channel.isDMBased()) return;

    client.moderationLogger.handleChannelCreate(channel);
  }
}
