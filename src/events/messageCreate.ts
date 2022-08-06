import { Awaitable, Message } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'messageCreate'> {
  public constructor() {
    super('messageCreate');
  }

  public callback(client: VladimirClient, message: Message): Awaitable<void> {
    if(message.author.bot) return;
    if(message.channel.isDMBased()) return;

    const { prefix } = client.commandHandler;
    const hasPrefix = message.content.startsWith(prefix);

    const args = hasPrefix
      ? message.content.slice(prefix.length).split(/ +/)
      : message.content.split(/ +/);

    const command = args.shift()?.toLowerCase();

    if(hasPrefix && command && client.commandHandler.hasCommand(command)) {
      return client.commandHandler.execute(command, message, args);
    }
    client.moderationLogger.handleMessageCreate(message)
  }
}
