import { Message, PermissionsString, EmbedBuilder, GuildMember } from "discord.js";
import { readdir, lstat                                        } from 'fs/promises';
import { join                                                  } from 'path';
import { VladimirClient                                        } from "../../VladimirClient";
import { Command                                               } from "../Command";
import { Constants                                             } from '../../../src/utils/constants';
import { CommandErrorEmbed                                     } from "../CommandErrorEmbed";

const { EmbedColors } = Constants;
const { RED } = EmbedColors

export class CommandHandler {
  private client: VladimirClient;
  public commands: Map<string, Command>;
  public prefix: string;

  public constructor(client: VladimirClient) {
    this.client = client;
    this.prefix = '~';

    this.commands = new Map();

    this.loadCommands(join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'dist',
      'src',
      'commands'
    ));
  }

  private missingPermissionsEmbed(member: GuildMember, neededPerms: Array<PermissionsString>): EmbedBuilder {
    const missing = member.permissions.missing(neededPerms)
      .map(perm => `${perm},`).join('\n');

    const embed = new EmbedBuilder()
      .setDescription(`\`${missing}\``)
      .setColor(RED)
      .setAuthor({ name: `${member.id === member.guild.members.me.id ? 'I' : 'You'} need the permissions below to use this command!` });

    return embed;
  }

  public validate(command: Command, message: Message): Promise<{ success: boolean, reason?: string }> {
    return new Promise((resolve, reject) => {
      const { member: executor, guild } = message;
      const clientMember = guild.members.me;

      const { clientPerms, userPerms } = command.requirements;

      if(!executor.permissions.has(userPerms)) {
        message.channel.send({ embeds: [ this.missingPermissionsEmbed(executor, userPerms) ] });

        reject({
          success: false,
          reason: `User missing permissions`
        });
      }

      if(!clientMember.permissions.has(clientPerms)) {
        message.channel.send({ embeds: [ this.missingPermissionsEmbed(clientMember, clientPerms) ] });

        reject({
          success: false,
          reason: 'Client missing permissions'
        });
      }
    });
  }

  public setPrefix(prefix: string): void {
    this.prefix = prefix; // TODO: DB Config
  }

  public hasCommand(command: string): boolean {
    return this.commands.has(command);
  }

  public execute(command: string, message: Message, args: Array<string>): void {
    const cmd = this.commands.get(command);

    if(this.validate(cmd, message)) {
      cmd.run(this.client, message, args);
    }
  }

  public help(command: string, message: Message, mention?: boolean): void {
    mention ??= false;
    const cmd = this.commands.get(command);

    if(!cmd) {
      const embed = new CommandErrorEmbed(command, `\`${command}\` is not a registered command!`, this, message.author);

      message.reply({ embeds: [ embed ], allowedMentions: { repliedUser: mention } });
    } else {
      const {
        aliases,
        args,
        cooldown,
        description
      } = cmd.help;

      const {
        clientPerms,
        userPerms
      } = cmd.requirements;

      const embed = new EmbedBuilder()
        .setTitle(command.replace(/\b(\w)/, char => char.toUpperCase()))
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(description)
        .setColor('Random')
        .addFields(
          {
            name: 'Cooldown',
            value: `${cooldown} seconds`,
            inline: false
          },
          {
            name: 'Aliases',
            value: aliases.reduce((str, alias, index) => str += `\`${alias}\`${index < aliases.length - 1 ? ', ' : ''}`,''),
            inline: false
          },
          {
            name: 'Arguments',
            value: args.reduce((str, [ name, description ], index) => str += `**${name}** : **${description}**${index < args.length - 1 ? '\n' : ''}`,''),
            inline: false
          },
          {
            name: 'The bot requires the following permissions',
            value: clientPerms.reduce((str, perm, index) => str += `${perm.replace(/\b(\w)/g, char => char.toUpperCase())}${index < clientPerms.length - 1 ? ', ' : ''}`, ''),
            inline: false
          },
          {
            name: 'You need the following permissions',
            value: userPerms.reduce((str, perm, index) => str += `${perm.replace(/\b(\w)/g, char => char.toUpperCase())}${index < userPerms.length - 1 ? ', ' : ''}`, ''),
            inline: false
          }
        );

      message.reply({ embeds: [ embed ], allowedMentions: { repliedUser: mention } });
    }
  }

  public async loadCommands(dir: string): Promise<void> {
    try {
      for(const file of await readdir(dir)) {
        const next = join(dir, file);

        if((await lstat(next)).isDirectory()) {
          this.loadCommands(next);
        } else {
          const { default: Command } = await import(next);
          const command = new Command();

          this.commands.set(command.help.name, command);
        }
      }
    } catch(err) {
      this.handleError(err);
    }
  }

  private handleError(error: unknown): void {
    console.log(error);
  }
}
