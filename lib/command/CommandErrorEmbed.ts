import { EmbedBuilder, User } from "discord.js";
import { CommandHandler     } from "./handler/CommandHandler";
import { DiscordFormatter   } from '../formatter/DiscordFormatter';

const { bold } = DiscordFormatter;

export class CommandErrorEmbed extends EmbedBuilder {
  public constructor(command: string, error: string, handler: Readonly<CommandHandler>, user: User) {
    super();

    this.setColor('#ff0000');
    this.setDescription(`${error}\n\nUse the command "${bold(`${handler.prefix}help ${command}"`)} to get some help with using this command!`);
    this.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
  }
}
