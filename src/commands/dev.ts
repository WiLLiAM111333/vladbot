import { Command } from "../../lib/command/Command";
import { VladimirClient } from "../../lib/VladimirClient";
import { AttachmentBuilder, EmbedBuilder, Message } from "discord.js";
import { join } from "path";

export default class extends Command {
  public constructor() {
    super({
      name: 'dev',
      category: 'other',
      description: 'custom commands',
      args: []
    });
  }

  public run(client: VladimirClient, message: Message, args: Array<string>): void {
    const attachment = new AttachmentBuilder(join(__dirname, '..', '..', '..', 'assets', 'update.mp4'), { name: 'update.mp4' });

    const embed = new EmbedBuilder()
      .setDescription('xd')
      .setImage(`attachment://${attachment.name}`);

    message.channel.send({ embeds: [ embed ], files: [ attachment ] });
  }
}
