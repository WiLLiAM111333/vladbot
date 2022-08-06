import { Client, ClientOptions } from "discord.js";
import { CommandHandler } from "./command/handler/CommandHandler";
import { EventHandler } from "./event/EventHandler";
import { ModerationLogger } from "./logger/ModerationLogger";

export class VladimirClient extends Client {
  private eventHandler: EventHandler;
  public commandHandler: CommandHandler;
  public moderationLogger: ModerationLogger;

  public constructor(options: ClientOptions) {
    super(options);

    this.commandHandler = new CommandHandler(this);
    this.moderationLogger = new ModerationLogger(this);
    this.eventHandler = new EventHandler(this);

    this.eventHandler.loadEvents();
  }
}
