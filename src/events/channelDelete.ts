import { Awaitable, NonThreadGuildBasedChannel } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'channelDelete'> {
  public constructor() {
    super('channelDelete');
  }

  public callback(client: VladimirClient, channel: NonThreadGuildBasedChannel): Awaitable<void> {
    if(channel.isDMBased()) return;

    client.moderationLogger.handleChannelDelete(channel);
  }
}

