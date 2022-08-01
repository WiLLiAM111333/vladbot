import { Awaitable, NonThreadGuildBasedChannel } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'channelUpdate'> {
  public constructor() {
    super('channelUpdate');
  }

  public callback(client: VladimirClient, oldChannel: NonThreadGuildBasedChannel, newChannel: NonThreadGuildBasedChannel): Awaitable<void> {
    if(oldChannel.isDMBased()) return;

    client.moderationLogger.handleChannelUpdate(oldChannel, newChannel);
  }
}
