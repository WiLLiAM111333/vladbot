import { EmbedBuilder, Message } from "discord.js";
import { Command } from "../../lib/command/Command";
import { DiscordFormatter } from "../../lib/formatter/DiscordFormatter";
import { StrikeManager } from "../../lib/strike/StrikeManager";
import { VladimirClient } from "../../lib/VladimirClient";

const { bold } = DiscordFormatter;

export default class extends Command {
  private strikeManager: StrikeManager;

  public constructor() {
    super({
      name: 'strike',
      description: 'Strikes a member for a given reason',
      category: 'config',
      args: [['User', 'Mention or userID to select which user gets striked'], ['Reason', 'The rest of the arguments, spaces are allowed']],
      aliases: [],
      userPerms: ['BanMembers']
    });

    this.strikeManager = new StrikeManager();
  }

  public async run(client: VladimirClient, message: Message, args: Array<string>): Promise<unknown> {
    const user = /^\d{10,30}$/.test(args[0])
      ? await message.guild.members.fetch(args[0])
      : await message.guild.members.fetch(message.mentions.users.first().id);

    if(!user) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription('Could not find the given user in the server')
        .setColor('#ff0000');

      return message.channel.send({ embeds: [ embed ] });
    }

    try {
      const reason = args.slice(1).join(' ') ?? 'No reason set';
      const userID = user.user.id;
      const guildID = message.guildId;

      const strike = await this.strikeManager.addStrike({ userID, reason, guildID });
      const allStrikes = await this.strikeManager.getAll({ userID, guildID });

      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`Saved strike number ${allStrikes.length} for the reason\n${bold(reason)}`)
        .setColor('#37ff05');

      message.channel.send({ embeds: [ embed ] });
      client.moderationLogger.handleStrikeAdd(message.guild, message.author, user, strike, allStrikes.length);

      for(const toProcess of allStrikes) {
        if(this.strikeManager.strikeIsExpired(toProcess)) {
          this.strikeManager.delete(toProcess);
        }
      }
    } catch (err) {
      throw err;
    }
  }
}
