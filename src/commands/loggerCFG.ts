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
    const hasCFG = await this.configManger.has(message.guildId);

    const allowedKeys = ['guildID', 'logChannelID', 'modRoleIDs'];
    const key = args.shift().toLowerCase();

    if(!key || !allowedKeys.map(key => key.toLowerCase()).includes(key)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`You need to provide one of the following keys:\n${allowedKeys.join('\n')}`);

      return message.channel.send({ embeds: [ embed ] });
    }

    if(key === 'modRoleIDs') {
      for(const snowflake of args) {
        if(!snowflakeRegex.test(snowflake)) {
          const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription('Please provide a valid discord snowflake!');

          return message.channel.send({ embeds: [ embed ] });
        }
      }

      if(hasCFG) {
        return await this.configManger.update({
          guildID,
          modRoleIDs: args
        });
      }

      return await this.configManger.add({
        guildID,
        modRoleIDs: args,
        logChannelID: undefined
      });
    }

    const value = args.shift();

    if(!snowflakeRegex.test(value)) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription('Please provide a valid discord snowflake!');

      return message.channel.send({ embeds: [ embed ] });
    }

    if(hasCFG) {
      return await this.configManger.update({
        guildID,
        logChannelID: value
      });
    }

    await this.configManger.add({
      guildID,
      logChannelID: value,
      modRoleIDs: undefined
    });
  }
}
