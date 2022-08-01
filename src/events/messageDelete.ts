import { Awaitable, Message } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'messageDelete'> {
  public constructor() {
    super('messageDelete');
  }

  public callback(client: VladimirClient, message: Message): Awaitable<void> {
    if(message.channel.isDMBased()) return;

    client.moderationLogger.handleMessageDelete(message);
  }
}
