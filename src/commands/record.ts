import stripIndent from "strip-indent";
import { EmbedBuilder, Message } from "discord.js";
import { Command } from "../../lib/command/Command";
import { DiscordFormatter } from "../../lib/formatter/DiscordFormatter";
import { StrikeManager } from "../../lib/strike/StrikeManager";
import { VladimirClient } from "../../lib/VladimirClient";

const { bold, inlineCodeBlock } = DiscordFormatter;

export default class extends Command {
  private strikeManager: StrikeManager;

  public constructor() {
    super({
      name: 'record',
      description: 'Sends the record of a users strikes',
      category: 'moderation',
      args: [['User', 'Mention or userID to select which users record to get']],
      aliases: [],
      userPerms: ['BanMembers']
    });

    this.strikeManager = new StrikeManager();
  }

  public async run(client: VladimirClient, message: Message, args: Array<string>): Promise<unknown> {
    const member = /^\d{10,30}$/.test(args[0])
      ? await message.guild.members.fetch(args[0])
      : await message.guild.members.fetch(message.mentions.users.first().id);

    if(!member) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription('Could not find the given user in the server')
        .setColor('#ff0000');

      return message.channel.send({ embeds: [ embed ] });
    }

    try {
      const userID = member.user.id;
      const guildID = message.guildId;

      const allStrikes = await this.strikeManager.getAll({ userID, guildID });

      const str = allStrikes.length
        ? allStrikes.reduce((_str, strike, index) => {
            return _str += stripIndent(`
              ${bold(`${index + 1}.`)}
              ${bold('Expire Date (ISO Time Format)')}: ${inlineCodeBlock(strike.expireDate)}
              ${bold('Reason')}:
                "${bold(strike.reason)}"
              ---
            `)
          }, '')
        : 'This user has no strikes on record'

      const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setDescription(str.trim())
        .setColor('#37ff05');

      message.channel.send({ embeds: [ embed ] });
    } catch (err) {
      throw err;
    }
  }
}
