import { Client, ClientOptions, Options } from "discord.js";
import { CommandHandler } from "./command/handler/CommandHandler";
import { EventHandler } from "./event/EventHandler";
import { ModerationLogger } from "./logger/ModerationLogger";

export class VladimirClient extends Client {
  private eventHandler: EventHandler;
  public commandHandler: CommandHandler;
  public moderationLogger: ModerationLogger;

  public constructor(options: ClientOptions) {
    options.makeCache = Options.cacheWithLimits({
      ApplicationCommandManager: 0,
      BaseGuildEmojiManager: 0,
      GuildEmojiManager: 0,
      GuildMemberManager: 0,
      GuildBanManager: 0,
      GuildInviteManager: 0,
      GuildScheduledEventManager: 0,
      GuildStickerManager: 0,
      MessageManager: 0,
      PresenceManager: 0,
      ReactionManager: 0,
      ReactionUserManager: 0,
      StageInstanceManager: 0,
      ThreadManager: 0,
      ThreadMemberManager: 0,
      UserManager: 0,
      VoiceStateManager: 0
    });

    super(options);

    this.commandHandler = new CommandHandler(this);
    this.moderationLogger = new ModerationLogger(this);
    this.eventHandler = new EventHandler(this);

    this.eventHandler.loadEvents();
  }
}
