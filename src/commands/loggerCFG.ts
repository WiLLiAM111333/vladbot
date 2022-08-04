import { EmbedBuilder, Message } from "discord.js";
import { Command } from "../../lib/command/Command";
import { ModerationLoggerConfigManager } from "../../lib/logger/config/ModerationLoggerConfigManager";
import { VladimirClient } from "../../lib/VladimirClient";

export default class extends Command {
  private configManger: ModerationLoggerConfigManager;

  public constructor() {
    super({
      name: 'loggercfg',
      description: 'Configures the logger',
      category: 'config',
      args: [],
      aliases: ['logger-cfg'],
      userPerms: ['Administrator']
    });

    this.configManger = new ModerationLoggerConfigManager();
  }

  public async run(client: VladimirClient, message: Message, args: Array<string>): Promise<unknown> {
    const snowflakeRegex = /\d{10,25}/;
    const guildID = message.guildId

    const oldCFG = await this.configManger.get(guildID)

    const allowedKeys = ['guildID', 'logChannelID', 'modRoleID'];

    const rawKey = args.shift().toLowerCase();
    const key = allowedKeys.find(k => k.toLowerCase() === rawKey);

    if(!key || !allowedKeys.includes(key)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`You need to provide one of the following keys:\n${allowedKeys.join('\n')}`);

      return message.channel.send({ embeds: [ embed ] });
    }

    const value = args.shift();

    if(!snowflakeRegex.test(value)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription('Please provide a valid discord snowflake!');

      return message.channel.send({ embeds: [ embed ] });
    }

    if(oldCFG) {
      oldCFG[key] = value;
      return await oldCFG.save();
    }

    await this.configManger.add({
      guildID,
      [key]: value
    });
  }
}
