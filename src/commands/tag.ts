import { Message } from "discord.js";
import { Command } from "../../lib/command/Command";
import { VladimirClient } from "../../lib/VladimirClient";

export default class extends Command {
  public constructor() {
    super({
      name: 'tag',
      category: 'other',
      description: 'custom commands',
      args: []
    })
  }

  public run(client: VladimirClient, message: Message, args: Array<string>): void {

  }
}
