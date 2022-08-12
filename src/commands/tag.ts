import { Message, EmbedBuilder } from "discord.js";
import { Command } from "../../lib/command/Command";
import { VladimirClient } from "../../lib/VladimirClient";
import { DiscordFormatter } from '../../lib/formatter/DiscordFormatter';
import { TagManager } from '../../lib/tags/TagManager';
import stripIndent from "strip-indent";

const { bold, inlineCodeBlock, codeBlock } = DiscordFormatter;

export default class extends Command {
  private tagManager: TagManager;

  public constructor() {
    super({
      name: 'tag',
      category: 'other',
      description: 'custom commands',
      args: []
    });

    this.tagManager = new TagManager();
  }

  public async run(client: VladimirClient, message: Message, args: Array<string>): Promise<unknown> {
    const guildID = message.guildId; // mad?

    const query = args.shift();

    try {
      switch(query) {
        case 'create': {
          const tag = args.shift();
          const text = args.join(' ');
          const hasTag = await this.tagManager.has(guildID, tag);

          if(hasTag) {
            const embed = new EmbedBuilder()
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
              .setColor('#ff0000')
              .setDescription(`This tag already exists, please use ${inlineCodeBlock(`${client.commandHandler.prefix}tag update ${tag} ...`)}`);

            return message.channel.send({ embeds: [ embed ] });
          }

          await this.tagManager.create({
            guildID,
            tag,
            text
          });

          const embed = new EmbedBuilder()
            .setAuthor({ name: `Successfully saved tag: ${tag}`, iconURL: message.author.displayAvatarURL() })
            .setColor('#0000ff')
            .setDescription(codeBlock(text));

          return message.channel.send({ embeds: [ embed ] });
        }

        case 'update': {
          const tag = args.shift();
          const text = args.join(' ');
          const hasTag = await this.tagManager.has(guildID, tag);

          if(!hasTag) {
            const embed = new EmbedBuilder()
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
              .setColor('#ff0000')
              .setDescription(`This tag does not exist, please use ${inlineCodeBlock(`${client.commandHandler.prefix}tag create ${tag} ...`)}`);

            return message.channel.send({ embeds: [ embed ] });
          }

          await this.tagManager.update({
            guildID,
            tag,
            text
          });

          const embed = new EmbedBuilder()
            .setAuthor({ name: `Successfully updated tag: ${tag}`, iconURL: message.author.displayAvatarURL() })
            .setColor('#0000ff')
            .setDescription(codeBlock(text));

          return message.channel.send({ embeds: [ embed ] });
        }

        case 'delete': {
          const tag = args.shift();
          const hasTag = await this.tagManager.has(guildID, tag);

          if(!hasTag) {
            const embed = new EmbedBuilder()
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
              .setColor('#ff0000')
              .setDescription(`This tag does not exist, please use ${inlineCodeBlock(`${client.commandHandler.prefix}tag create ${tag} ...`)}`);

            return message.channel.send({ embeds: [ embed ] });
          }

          await this.tagManager.delete(guildID, tag);

          const embed = new EmbedBuilder()
            .setAuthor({ name: `Successfully deleted tag: ${tag}`, iconURL: message.author.displayAvatarURL() })
            .setColor('#0000ff')

          return message.channel.send({ embeds: [ embed ] });
        }

        default:
          const dbTag = await this.tagManager.get(guildID, query);
          const hasTag = !!dbTag;

          if(!hasTag) {
            const embed = new EmbedBuilder()
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
              .setColor('#ff0000')
              .setDescription(`This tag does not exist, please use ${inlineCodeBlock(`${client.commandHandler.prefix}tag create ${query} ...`)}`);

            return message.channel.send({ embeds: [ embed ] });
          }

          const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setColor('#0000ff')
            .setDescription(stripIndent(`
              ${bold('Tag')}: ${inlineCodeBlock(query)}
              ${dbTag.text}
            `));

          message.channel.send({ embeds: [ embed ] });
        break;
      }
    } catch (err) {
      throw err;
    }
  }
}
