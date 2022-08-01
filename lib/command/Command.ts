import { CommandConstructor  } from "./CommandConstructor";
import { CommandHelp         } from "./CommandHelp";
import { ICommand            } from "./ICommand";
import { CommandRequirements } from "./CommandRequirements";
import { VladimirClient      } from "../VladimirClient";
import { Message             } from "discord.js";
import { CommandErrorEmbed   } from './CommandErrorEmbed';

export abstract class Command implements ICommand {
  public requirements: CommandRequirements;
  public help: CommandHelp;

  public abstract run(client: VladimirClient, message: Message, args: Array<string>): Awaited<unknown>;

  public constructor(data: CommandConstructor) {
    const {
      args,
      name,
      aliases,
      clientPerms,
      cooldown,
      description,
      userPerms,
      category
    } = data;

    this.requirements = {
      clientPerms: clientPerms ?? [
        'SendMessages',
        'ViewChannel',
        'AttachFiles',
        'EmbedLinks',
        'ManageMessages',
      ],
      userPerms: userPerms ?? [
        'SendMessages',
        'ViewChannel',
        'AttachFiles',
        'EmbedLinks'
      ]
    };

    this.help = {
      name,
      category: category ?? 'other',
      args: args ?? [],
      aliases: aliases ?? [],
      cooldown: cooldown ?? 0,
      description: description ?? 'No description set',
    }
  }

  protected replyError(message: Message, command: string, error: string, mention?: boolean) {
    const embed = new CommandErrorEmbed(command, error, message.client.commandHandler, message.author);

    mention ??= false;
    message.reply({ embeds: [ embed ], allowedMentions: { repliedUser: mention } });
  }
}
