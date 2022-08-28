import stripIndent                       from 'strip-indent';
import { Constants                     } from '../../src/utils/constants';
import { Util                          } from '../../src/utils';
import { VladimirClient                } from '../VladimirClient';
import { LogEmbed                      } from './LogEmbed';
import { ResolvedChannelTypeUnion      } from './ResolvedChannelTypeUnion';
import { ModerationLoggerConfigManager } from './config/ModerationLoggerConfigManager';
import { DiscordFormatter              } from '../formatter/DiscordFormatter';
import { ByteConverter                 } from '../converter/ByteConverter';
import { IModerationLoggerLogOptions   } from './IModerationLoggerLogOptions';
import { IModerationLoggerConfig       } from './config/IModerationLoggerConfig';
import {
  Snowflake,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  GuildEmoji,
  GuildBan,
  Role,
  Sticker,
  Message,
  GuildAuditLogsEntry,
  PermissionsString,
  Webhook,
  NonThreadGuildBasedChannel,
  AuditLogEvent,
  GuildAuditLogsTargetType,
  ChannelType,
  GuildMember,
  roleMention,
  channelMention,
  userMention,
  Guild
} from 'discord.js';

const { bold, cursive, inlineCodeBlock, codeBlock } = DiscordFormatter;
const { getCombinedStringArrayLength, isProduction } = Util;
const {
  discordSupportedMedias,
  MEDIA_SUFFIX_REGEX,
  URL_REGEX,
  TENOR_REGEX
} = Constants;

/**
 * Handles logging throughout guilds
 */
export class ModerationLogger {
  /**
   * @description Stores audit logs in this format: <Guild ID, Auditlog Entry ID>
   * @public
   * @type {Map<Snowflake, Snowflake>}
   */
  public auditLogs: Map<Snowflake, Snowflake>; // <Guild ID, Auditlog Entry ID>
  /**
   * @description Handles logging for the logger
   * @private
   * @type {ModerationLoggerConfigManager}
   */
  private configManager: ModerationLoggerConfigManager;
  /**
   * @description The discord client
   * @private
   * @type {VladimirClient}
   */
  private client: VladimirClient;
  /**
   * @description Checks if the bot is running on a verbose setting
   * @private
   * @type {boolean}
   */
  private verbose: boolean;
  /**
   * @description Cached config for the moderationlogger
   * @private
   * @type {IModerationLoggerConfig}
   */
  private cachedCFGs: Map<Snowflake, IModerationLoggerConfig>; // <GuildID, IModerationLoggerConfig>

  /**
   * @public
   * @constructor
   * @param {VladimirClient} client
   */
  public constructor(client: VladimirClient) {
    this.client = client;
    this.auditLogs = new Map<Snowflake, Snowflake>(); // Memory leak needs cleaning up
    this.verbose = !isProduction();
    this.configManager = new ModerationLoggerConfigManager();

    this.cachedCFGs = new Map();
  }

  /**
   * @description Convers discord.js channel types to more readable types for embeds.
   * @private
   * @param {GuildChannel} type
   * @returns {ResolvedChannelTypeUnion}
   */
  private convertDJSType({ type }: GuildChannel): ResolvedChannelTypeUnion {
    return type === ChannelType.GuildCategory
      ? 'Category'
      : type === ChannelType.GuildNews
        ? 'News'
        : type === ChannelType.GuildStageVoice
          ? 'Stage'
          : type === ChannelType.GuildText
            ? 'Text'
            : type === ChannelType.GuildVoice
              ? 'Voice'
              : 'UNSUPPORTED_CHANNEL_TYPE'
  }

  /**
   * @description Replaces the first letter in every word with the same uppercase letter.
   * @private
   * @param {string} str
   * @returns {string}
   */
  private firstLetterToUpperCase(str: string): string {
    return str.replace(/\b(\w)/, char => char.toUpperCase());
  }

  /**
   * @description Converts bitrate from bit/s to kb/s.
   * @private
   * @param {number} bitrate
   * @returns {number}
   */
  private convertBitratetoKBPS(bitrate: number): number {
    return bitrate / 1000;
  }

  /**
   * @description Converts a boolean to a string
   * @private
   * @param {boolean} bool
   * @returns {string}
   */
  private convertBoolToStr(bool: boolean): string {
    return this.firstLetterToUpperCase(String(bool));
  }

  /**
   * @description Retrieves the users tag from the audit log.
   * @private
   * @param {GuildAuditLogsEntry} log
   * @returns {string}
   */
  private getTagFromAuditLog<TAction extends AuditLogEvent, TActionType extends 'Update' | 'Create' | 'Delete', TTargetType extends GuildAuditLogsTargetType>(log: GuildAuditLogsEntry<TAction, TActionType, TTargetType>): string {
    return log?.executor.tag ?? 'USR_FETCH_ERR';
  }

  /**
   * @description Retrievse the users avatar from the audit log.
   * @private
   * @param {GuildAuditLogsEntry} log
   * @returns {string | null}
   */
  private getAvatarFromAuditLog<TAction extends AuditLogEvent, TActionType extends 'Update' | 'Create' | 'Delete', TTargetType extends GuildAuditLogsTargetType>(log: GuildAuditLogsEntry<TAction, TActionType, TTargetType>): string | null {
    return log?.executor.displayAvatarURL();
  }

  /**
   * @description Gets the cached config for the given guild
   * @private
   * @param {Snowflake} guildID
   * @returns {IModerationLoggerConfig}
   */
  private getCachedCFG(guildID: Snowflake): IModerationLoggerConfig {
    return this.cachedCFGs.get(guildID)
  }

  /**
   * @description Caches a given config
   * @private
   * @param {IModerationLoggerConfig} cfg
   * @returns {void}
   */
  private cacheCFG(cfg: IModerationLoggerConfig): void {
    this.cachedCFGs.set(cfg.guildID, cfg);
  }

  /**
   * @description Formats a Discord.JS `PermissionsString` string.
   * @private
   * @param {PermissionsString} perm
   * @returns {string}
   */
  private formatRawDJSPermissionString(perm: PermissionsString): string {
    return perm
      .replace(/_/g, ' ')
      .replace(/\b(\w)/g, char => char.toUpperCase());
  }

  /**
   * @description Retrieves the latest audit log registered to the given guild.
   * Important to note it deletes the guilds entry as well to clean up memory.
   * @private
   * @param {Snowflake} guildID
   * @returns {Snowflake}
   */
  private getLastAuditLogID(guildID: Snowflake): Snowflake {
    const log = this.auditLogs.get(guildID);

    if(this.verbose) {
      console.log(this.auditLogs);
    }

    this.auditLogs.delete(guildID);

    return log;
  }

  /**
   * @description Finds an audit log based on the given AuditLogEvent
   * @private
   * @async
   * @param {Guild} guild
   * @param {AuditLogEvent} type
   * @returns {Promise<GuildAuditLogsEntry<TAction>>}
   */
  private async findAuditLog<TAction extends AuditLogEvent>(guild: Guild, type: TAction): Promise<GuildAuditLogsEntry<TAction>> {
    const guildID = guild.id;

    const lastLog = this.getLastAuditLogID(guildID);
    const logs = await guild.fetchAuditLogs({ type });

    const log = logs.entries.find(log => log.id !== lastLog);

    return log;
  }

  /**
   * @description Assigns `lastAuditLogID` to the id log id if it exists. (nice very coherent william)
   * @private
   * @param {Snowflake} guildID
   * @param {GuildAuditLogsEntry} log
   * @returns {void}
   */
  private assignAuditLogEntry<TAction extends AuditLogEvent, TActionType extends 'All' | 'Update' | 'Create' | 'Delete', TTargetType extends GuildAuditLogsTargetType>(guildID: Snowflake, log: GuildAuditLogsEntry<TAction, TActionType, TTargetType>): void {
    this.auditLogs.set(guildID, log?.id ?? this.auditLogs.get(guildID));
  }

  /**
   * @description Checks if a given message includes a mentioned user, only checked in messageDelete event
   * @private
   * @param {Message} message
   * @returns {boolean}
   */
  private isGhostPing(message: Message): boolean {
    const { members, roles } = message.mentions;

    for(const [ , member ] of members) {
      if(!member.user.bot) {
        return true;
      }
    }

    return !!roles.size;
  }

  /**
   * @description Logs to webhook and nothing else
   * @private
   * @async
   * @param {Snowflake} guildID
   * @param {IModerationLoggerLogOptions} options
   * @param {?IModerationLoggerConfig} cfg
   * @returns {Promise<void>}
   */
  private async log(guildID: Snowflake, options: IModerationLoggerLogOptions, cfg?: IModerationLoggerConfig): Promise<void> {
    try {
      if(this.verbose) {
        console.log(`log: ${guildID}`, options);
      }

      //? Never log if there is no embed, could crash the bot as there is very rarely any extra content sent
      if(options.embeds) {
        const { embeds, files, pingModRole, content } = options;
        const hook = await this.getWebHook(guildID);

        if(!hook) {
          return;
        }

        if(pingModRole) {
          if(!cfg) {
            throw new Error('No CFG in log function but pingModRole is true');
          }

          const { modRoleID } = cfg;

          hook.send({
            embeds,
            files,
            allowedMentions: { roles: [ cfg.modRoleID ] },
            content: roleMention(modRoleID)
          });
        } else {
          hook.send({ embeds, files, content });
        }
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * @description Gets the existing `Webhook`. This creates a new `Webhook` in the event of it not existing.
   * @private
   * @async
   * @param {Snowflake} guildID
   * @param {?IModerationLoggerConfig} config
   * @returns {Promise<Webhook>}
   */
  private async getWebHook(guildID: Snowflake, config?: IModerationLoggerConfig): Promise<Webhook> {
    try {
      const cfg = config ?? await this.configManager.get(guildID);

      if(!cfg?.logChannelID) {
        return;
      }

      const guild = await this.client.guilds.fetch(guildID);
      const channel = await guild.channels.fetch(cfg.logChannelID) as TextChannel;

      const webHooks = await channel.fetchWebhooks();
      const hook = webHooks.find(hook => hook.owner.id === this.client.user.id);

      return hook ?? await channel.createWebhook({ name: 'Vladimir Bot Logger' });
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event channelCreate
   * @public
   * @async
   * @param {GuildChannel} channel
   * @returns {Promise<void>}
   */
  public async handleChannelCreate(channel: GuildChannel): Promise<void> {
    const { type: rawType, name, guildId, guild } = channel;

    if([ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM].includes(rawType)) { // Ignore threads and DMs
      return;
    }

    try {
      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.ChannelCreate);

      const type = this.convertDJSType(channel);
      const tag = this.getTagFromAuditLog(auditLogEntry);
      const category = channel?.parent?.name ?? 'No Category';

      const authorStr = type === 'Category'
        ? `Category "${name}" has been created by ${tag}`
        : `${type} channel "${name}" has been created by ${tag}`;

      let descriptionStr: string;

      if(channel instanceof VoiceChannel) {
        const rtcRegion = channel?.rtcRegion === null ? 'Automatic' : this.firstLetterToUpperCase(channel?.rtcRegion);

        descriptionStr = stripIndent(`
          ${bold('Category')}: ${inlineCodeBlock(category)}
          ${bold('Bitrate')}: ${inlineCodeBlock(`${this.convertBitratetoKBPS(channel.bitrate)}kbps`)}
          ${bold('Region')}: ${inlineCodeBlock(rtcRegion)}
        `).replace(/\n/, '');
      } else if(channel instanceof TextChannel) {
        descriptionStr = stripIndent(`
          ${bold('Category')}: ${inlineCodeBlock(category)}
          ${bold('NSFW')}: ${inlineCodeBlock(this.convertBoolToStr(channel.nsfw))}
        `);
      }

      const embed = new LogEmbed(0)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(descriptionStr);

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handle the event channelDelete
   * @public
   * @async
   * @param {GuildChannel} channel
   * @returns {Promise<void>}
   */
  public async handleChannelDelete(channel: NonThreadGuildBasedChannel): Promise<void> {
    const { type: rawType, name, guild, guildId } = channel;

    if([ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM].includes(rawType)) { // Ignore threads and DMs
      return;
    }

    try {
      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.ChannelDelete);

      const type = this.convertDJSType(channel);
      const tag = this.getTagFromAuditLog(auditLogEntry);

      const authorStr = type === 'Category'
        ? `Category "${name}" has been deleted by ${tag}`
        : `${type} channel "${name}" has been deleted by ${tag}`;

      const embed = new LogEmbed(1)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) });

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles event channelUpdate
   * @public
   * @async
   * @param {GuildChannel} oldChannel
   * @param {GuildChannel} newChannel
   * @returns {Promise<void>}
   */
  public async handleChannelUpdate(oldChannel: GuildChannel, newChannel: GuildChannel): Promise<void> {
    // I dont like it either 😫
    const disallowedChannelTypes = [ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM];

    if(disallowedChannelTypes.includes(oldChannel.type)) { // Ignore threads and DMs
      return;
    }

    if(oldChannel.position !== newChannel.position || oldChannel.rawPosition !== newChannel.rawPosition) { // Lets avoid spamming the API shall we
      return;
    }

    const { guild, guildId } = oldChannel;
    const diff = [];

    try {
      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.ChannelUpdate);

      if(oldChannel.name !== newChannel.name) {
        diff[diff.length] = `Changed the name from ${bold(oldChannel.name)} to ${bold(newChannel.name)}`
      }

      if(oldChannel.position !== newChannel.position) { // Channel was moved
        if(oldChannel.parentId !== newChannel.parentId) {
          const oldCategory = oldChannel?.parent?.name ?? 'being uncategorized';

          diff[diff.length] = `Moved to the category ${bold(newChannel.parent.name)} from ${bold(oldCategory)}`;
        } else return; // Ignore if the channel wasn't moved to another category
      }

      if(oldChannel instanceof TextChannel && newChannel instanceof TextChannel) {
        if(oldChannel.nsfw !== newChannel.nsfw) {
          const oldNSFW = this.convertBoolToStr(oldChannel.nsfw);
          const newNSFW = this.convertBoolToStr(newChannel.nsfw);

          diff[diff.length] = `Set the NSFW check to ${bold(oldNSFW)} from ${newNSFW}`;
        }

        if(oldChannel.topic !== newChannel.topic) {
          const [ oldTopic, newTopic ] = [oldChannel.topic, newChannel.topic];

          if(((oldTopic?.length ?? 0) + (newTopic?.length ?? 0) + getCombinedStringArrayLength(diff)) <= 4082 - (3 * diff.length)) {
            diff[diff.length] = `Topic changed from:\n"${cursive(oldTopic ?? 'NO_TOPIC')}" to:\n"${cursive(newTopic)}"`;
          }
        }

        if(oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
          const diffStr = `Set slowmode to ${bold(newChannel.rateLimitPerUser)} seconds from ${bold(oldChannel.rateLimitPerUser)}`;

          if(diffStr.length + getCombinedStringArrayLength(diff) < 4096 - (3 * diff.length)) {
            diff[diff.length] = diffStr;
          }
        }
      } else if(oldChannel instanceof VoiceChannel && newChannel instanceof VoiceChannel) {
        if(oldChannel.bitrate !== newChannel.bitrate) {
          const oldBitrate = this.convertBitratetoKBPS(oldChannel.bitrate);
          const newBitrate = this.convertBitratetoKBPS(newChannel.bitrate);

          diff[diff.length] = `Bitrate changed from ${bold(`${oldBitrate}kbps`)} to ${bold(`${newBitrate}kbps`)}`;
        }

        if(oldChannel.rtcRegion !== newChannel.rtcRegion) {
          const oldRTC = oldChannel.rtcRegion === null ? 'Automatic' : this.firstLetterToUpperCase(oldChannel.rtcRegion);
          const newRTC = newChannel.rtcRegion === null ? 'Automatic' : this.firstLetterToUpperCase(newChannel.rtcRegion);

          diff[diff.length] = `Region changed from ${bold(oldRTC)} to ${newRTC}`;
        }
      }

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const changePlural = diff.length > 1 ? 'changes' : 'change';

      const authorStr = `${tag} made ${diff.length} ${changePlural} to "${oldChannel.name}"`;

      const embed = new LogEmbed(1)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(diff.length ? diff.join('\n') : 'Unsupported changes');

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event emojiCreate
   * @public
   * @async
   * @param {GuildEmoji} emote
   * @returns {Promise<void>}
   */
  public async handleEmojiCreate(emote: GuildEmoji): Promise<void> {
    try {
      const { name, url, guild } = emote;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.EmojiCreate);
      const description = `${emote.animated ? bold('Requires Nitro\n') : ''}`;

      const author = emote.author
        ?? await emote.fetchAuthor()
        ?? auditLogEntry.executor;

      const authorStr = `The emote "${name}" has been created by ${author.tag}`;

      const embed = new LogEmbed(0)
        .setAuthor({ name: authorStr, iconURL: author.displayAvatarURL() })
        .setImage(url)

      if(description) {
        embed.setDescription(description);
      }

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch(err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event emojiDelete
   * @public
   * @async
   * @param {GuildEmoji} emote
   * @returns {Promise<void>}
   */
  public async handleEmojiDelete(emote: GuildEmoji): Promise<void> {
    const { name, url, guild } = emote;
    const guildID = guild.id;

    try {
      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.EmojiDelete);
      const tag = this.getTagFromAuditLog(auditLogEntry);

      const authorStr = `The emote "${name}" has been deleted by ${tag}`;

      const embed = new LogEmbed(1)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setImage(url);

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch(err) {
      if(err.code === 10014 && err.httpStataus === 404) {
        const embed = new LogEmbed(2)
          .setDescription('An emote was deleted but I was unable to retrieve any information about it!');

        this.log(guildID, { embeds: [ embed ] });
      } else {
        this.handleError(err);
      }
    }
  }

  /**
   * @description Handles the event emojiUpdate
   * @public
   * @async
   * @param {GuildEmoji} oldEmote
   * @param {GuildEmoji} newEmote
   * @returns {Promise<void>}
   */
  public async handleEmojiUpdate(oldEmote: GuildEmoji, newEmote: GuildEmoji): Promise<void> {
    try {
      const { name: oldName, guild } = oldEmote;
      const { name: newName } = newEmote;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.EmojiUpdate);

      if(oldName !== newName) {
        const tag = this.getTagFromAuditLog(auditLogEntry);

        const authorStr = `The emote "${oldName}" has been re-named to "${newName}" by ${tag}`;

        const embed = new LogEmbed(0)
          .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
          .setImage(newEmote.url);

        this.log(guildID, { embeds: [ embed ] });
        this.assignAuditLogEntry(guildID, auditLogEntry);
      }
    } catch(err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event guildBanAdd
   * @public
   * @async
   * @param {GuildBan} ban
   * @returns {Promise<void>}
   */
  public async handleGuildBanAdd(ban: GuildBan): Promise<void> {
    try {
      const { user, reason, guild } = ban;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.MemberBanAdd);

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const parsedReason = reason ?? auditLogEntry?.reason ?? 'No Reason Set';

      const authorStr = `"${user.tag}" was banned for "${parsedReason}" by ${tag}`;

      const embed = new LogEmbed(2)
        .setAuthor({ name: authorStr })

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event guildBanRemove
   * @public
   * @async
   * @param {GuildBan} ban
   * @returns {Promise<void>}
   */
  public async handleGuildBanRemove(ban: GuildBan): Promise<void> {
    try {
      const { user, reason, guild } = ban;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.MemberBanRemove);

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const authorStr = `"${user.tag}" has been un-banned by ${tag}`;

      const embed = new LogEmbed(2)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(`They were originally banned for the following reason:\n${bold(`"${reason ?? auditLogEntry?.reason ?? 'No Reason Set'}"`)}`);

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event roleCreate
   * @public
   * @async
   * @param {Role} role
   * @returns {Promise<void>}
   */
  public async handleRoleCreate(role: Role): Promise<void> {
    try {
      const { hexColor, hoist, mentionable, id, name, guild } = role;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.RoleCreate);

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const formattedHoist = this.convertBoolToStr(hoist);
      const formattedMentionable = this.convertBoolToStr(mentionable);

      const authorStr = `A new role was just created by ${tag}`;

      const descriptionStr = stripIndent(`
        ${bold('Name')}: ${inlineCodeBlock(name)}
        ${bold('Color')}: ${inlineCodeBlock(hexColor)}
        ${bold('Hoist')}: ${inlineCodeBlock(this.firstLetterToUpperCase(formattedHoist))}
        ${bold('Mentionable')}: ${inlineCodeBlock(formattedMentionable)}
        ${bold('ID')}: ${inlineCodeBlock(id)}
      `);

      const embed = new LogEmbed(0)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(descriptionStr);

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event roleDelete
   * @public
   * @async
   * @param {Role} role
   * @returns {Promise<void>}
   */
  public async handleRoleDelete(role: Role): Promise<void> {
    try {
      const { hexColor, hoist, id, name, mentionable, guild } = role;
      const guildID = guild.id;

      const formattedHoist = this.convertBoolToStr(hoist);
      const formattedMentionable = this.convertBoolToStr(mentionable);

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.RoleDelete);

      const embed = new LogEmbed(0)
        .setAuthor({ name: `The role "${name}" was just deleted by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(stripIndent(`
          ${bold('Color')}: ${inlineCodeBlock(hexColor)}
          ${bold('Hoist')}: ${inlineCodeBlock(formattedHoist)}
          ${bold('Mentionable')}: ${inlineCodeBlock(formattedMentionable)}
          ${bold('ID')}: ${inlineCodeBlock(id)}
        `));

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event roleUpdate
   * @public
   * @async
   * @param {Role} oldRole
   * @param {Role} newRole
   * @returns {Promise<void>}
   */
  public async handleRoleUpdate(oldRole: Role, newRole: Role): Promise<void> {
    if(oldRole.position !== newRole.position || oldRole.rawPosition !== newRole.rawPosition) {
      return;
    }

    try {
      const { name: oldName, hexColor: oldHex, guild } = oldRole;
      const { name: newName, hexColor: newHex } = newRole;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.RoleUpdate);

      let count = 0;
      const diff = [];

      const [ oldHoist, newHoist ] = [oldRole.hoist, newRole.hoist]
        .map(hoist => this.convertBoolToStr(hoist));

      const [ oldMentionable, newMentionable ] = [oldRole.mentionable, newRole.mentionable]
        .map(mentionable => this.convertBoolToStr(mentionable));

      if(oldName !== newName) {
        diff[count++] = `Changed name from ${bold(oldName)} to ${bold(newName)}`;
      }

      if(oldHex !== newHex) {
        diff[count++] = `Changed color from ${bold(oldHex)} to ${bold(newHex)}`;
      }

      if(oldHoist !== oldHoist) {
        diff[count++] = `Changed hoist from ${bold(oldHoist)} to ${bold(newHoist)}`;
      }

      if(oldMentionable !== newMentionable) {
        diff[count++] = `Changed mentionable from ${bold(oldMentionable)} to ${bold(newMentionable)}`;
      }

      if(oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        const oldPermObj = oldRole.permissions.serialize(true);
        const newPermObj = newRole.permissions.serialize(true);

        const permArr = [];
        let count = 0;

        for(const key in oldPermObj) {
          const oldPerm = oldPermObj[key];
          const newPerm = newPermObj[key];
          const formattedPermissionKey = this.formatRawDJSPermissionString(key as PermissionsString);

          if(!oldPerm && newPerm) { // Denied to allowed
            permArr[count++] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ❌ to ✅`;
          } else if(oldPerm && !newPerm) { // Allowed to denied
            permArr[count++] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ✅ to ❌`;
          }
        }

        diff[diff.length] = `Changed permissions:\n  - ${permArr.join('\n  - ')}`;
      }

      const embed = new LogEmbed(0)
        .setAuthor({ name: `The role "${oldRole.name}" was just edited by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(diff
          .map(str => str.length >= 45 ? `${str}\n` : str)
          .join('\n')
        );

      this.log(guildID, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event stickerCreate
   * @public
   * @async
   * @param {Sticker} sticker
   * @returns {Promise<void>}
   */
  public async handleStickerCreate(sticker: Sticker): Promise<void> {
    try {
      const { name, format, url, id, description, guild, guildId } = sticker;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.StickerCreate)

      const author = sticker.user
        ?? await sticker.fetchUser()
        ?? auditLogEntry.executor;

      const embed = new LogEmbed(0)
        .setAuthor({ name: `The sticker "${name} was just created by "${author.tag}`, iconURL: author.displayAvatarURL() })
        .setImage(url)
        .setDescription(stripIndent(`
          ${bold('Format')}: ${inlineCodeBlock(format)}
          ${bold('ID')}: ${inlineCodeBlock(id)}
          ${bold('Description')}: ${inlineCodeBlock(description)}
        `));

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch(err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event stickerUpdate
   * @public
   * @async
   * @param {Sticker} oldSticker
   * @param {Sticker} newSticker
   * @returns {Promise<void>}
   */
  public async handleStickerUpdate(oldSticker: Sticker, newSticker: Sticker): Promise<void> {
    // Sticker title 30 char max
    // Sticker description 100 char max
    // Emoji title 32 char max

    try {
      const { name: oldName, description: oldDescription, guild, guildId } = oldSticker;
      const { name: newName, description: newDescription } = newSticker;

      let count = 0;
      const diff = [];

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.StickerUpdate);

      if(oldName !== newName) {
        diff[count++] = `Changed name from ${bold(oldName)} to ${bold(newName)}`;
      }

      if(oldDescription !== newDescription) {
        diff[count++] = `Changed description:\n${cursive(`"${oldDescription}"`)}\n${cursive(`"${newDescription}"`)}`;
      }

      const embed = new LogEmbed(1)
        .setAuthor({ name: `The sticker "${oldSticker.name}" was just edited by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(diff
          .map(str => str.length >= 45 ? `${str}\n` : str)
          .join('\n')
        );

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch(err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event stickerDelete
   * @public
   * @async
   * @param {Sticker} sticker
   * @returns {Promise<void>}
   */
  public async handleStickerDelete(sticker: Sticker): Promise<void> {
    const { name, format, id, description, guild, guildId } = sticker;

    try {
      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.StickerDelete);

      const embed = new LogEmbed(1)
        .setAuthor({ name: `The sticker "${name}" was just deleted by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(stripIndent(`
          ${bold('Format')}: ${inlineCodeBlock(format)}
          ${bold('ID')}: ${inlineCodeBlock(id)}
          ${bold('Description')}: ${inlineCodeBlock(description)}
        `));

      this.log(guildId, { embeds: [ embed ] });
      this.assignAuditLogEntry(guildId, auditLogEntry);
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event messageDelete
   * @public
   * @async
   * @param {Message} message
   * @returns {void}
   */
  public async handleMessageDelete(message: Message): Promise<void> {
    const guildID = message.guild.id;

    try {
      const cfg = await this.configManager.get(guildID);
      this.cacheCFG(cfg);

      // Avoid the new voice channel text chats (i think)
      if(
        (cfg && message.channel.id === cfg.logChannelID)  ||
        !(message.channel instanceof TextChannel)         ||
        cfg.ignoredChannelIDs.includes(message.channelId) ||
        !message.guild
      ) return;

      const embed = new LogEmbed(0)
        .setAuthor({ name: `Deleted message from ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setDescription(`${bold('Channel')}: ${inlineCodeBlock(message.channel.name)}`)

      const currUTCTime = new Date(Date.now());

      const ghostPinghreshold = cfg.ghostPingDuration / 60;
      const timeDiff = ((currUTCTime.getTime() - message.createdAt.getTime()) / 1000) / 60
      const formattedTimeDiff = timeDiff.toFixed(2);

      const isGhostPing = this.isGhostPing(message);
      const isMessageReply = !!message.mentions.repliedUser && !message.mentions.repliedUser.bot
      const shouldMentionModRole = (timeDiff <= ghostPinghreshold) && (isGhostPing || isMessageReply)

      if(isGhostPing && !isMessageReply) {
        embed.setDescription(stripIndent(`
          ${bold('Potential Ghost Ping')}
          ${bold('Time Between')}: ${inlineCodeBlock(formattedTimeDiff)} minutes
          ${bold('Channel')}: ${inlineCodeBlock(message.channel.name)}
          ${bold('Content')}:
          ${message.content ?? 'NO_CONTENT'}
        `));
      } else {
        if(isMessageReply) {
          embed
            .setFooter({ text: 'This mention was a message reply' })
            .setDescription(stripIndent(`
              ${bold('Potential Ghost Ping')}
              ${bold('Time Between')}: ${inlineCodeBlock(formattedTimeDiff)} minutes
              ${bold('Mentioned User')}: ${userMention(message.mentions.repliedUser.id)}
              ${bold('Channel')}: ${inlineCodeBlock(message.channel.name)}
              ${bold('Content')}:
              ${message.content ?? 'NO_CONTENT'}
            `));
        } else {
          embed.setDescription(stripIndent(`
            ${bold('Channel')}: ${inlineCodeBlock(message.channel.name)}
            ${bold('Content')}:
            ${message.content ?? 'NO_CONTENT'}
          `));
        }
      }

      if(shouldMentionModRole) {
        this.log(guildID, { embeds: [ embed ], pingModRole: true }, cfg);
      } else {
        this.log(guildID, { embeds: [ embed ], pingModRole: false, content: (isGhostPing || isMessageReply) ? '(ghostping)' : '' })
      }
    } catch(err) {
      this.handleError(err);
    }
  }

  /**
   * ! Do not take args as a parameter from messageCreate event.
   * ! The array is passed by reference so the Array.shift() operation
   * ! affects this function too, leading to a missing argument even if this
   * ! method is called before the message handler shifts the args array for a command.
   * @description Handles the event messageCreate
   * @public
   * @async
   * @param {Message} message
   * @returns {Promise<void>}
   */
  public async handleMessageCreate(message: Message): Promise<void> {
    const { guildId } = message;

    try {
      const cfg = this.getCachedCFG(guildId) ?? await this.configManager.get(guildId);

      if(message.author.bot || cfg.ignoredChannelIDs.includes(message.channelId)) {
        return;
      }

      const messageObject = { embeds: [], files: [] };
      let firstEmbedHasAttachment = false;

      const mediaURLs = message.content
        .replace(/\n/g, ' ')
        .split(/\s+/)
        .filter(arg => arg && (MEDIA_SUFFIX_REGEX.test(arg) || TENOR_REGEX.test(arg)));

      const hasAttachments = !!(message.attachments.size);
      const hasMediaURLs = !!mediaURLs.length;

      if(this.verbose) {
        console.log(message.attachments);
        console.log(mediaURLs);

        mediaURLs.forEach(url => console.log(url))
      }

      const firstEmbed = new LogEmbed(0)
        .setAuthor({ name: `Message from ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setDescription(stripIndent(`
          ${bold('Author')}: ${inlineCodeBlock(message.author.tag)}
          ${bold('Channel')}: ${channelMention(message.channel.id)}
          ${bold('Content')}:
          ${message.content || 'NO_CONTENT'}
        `))
        .setFooter({ text: 'Potentially malicious files are listed below in embeds if present' })

      if(hasAttachments) {
        for(const [ attachmentID, attachment ] of message.attachments) {
          const splitName = attachment.name.split('.');
          const extension = splitName.pop().toLowerCase();
          const name = splitName.join('.');

          const isSupportedMedia = discordSupportedMedias.includes(extension);

          if(isSupportedMedia) {
            messageObject.files.push(attachment);

            if(!firstEmbedHasAttachment) {
              firstEmbed.setImage(`attachment://${attachment.name}`);
              firstEmbedHasAttachment = true;
            } else {
              messageObject.embeds.push(
                new LogEmbed(3)
                  .setImage(`attachment://${attachment.name}`)
                  .setAuthor({ name: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
              )
            }
          } else {
            messageObject.embeds.push(
              new LogEmbed(3)
                .setDescription(stripIndent(`
                  ${bold('ID')}: ${inlineCodeBlock(attachmentID)}
                  ${bold('URL')}: ${inlineCodeBlock(attachment.url)}
                  ${bold('Filename')}: ${inlineCodeBlock(name)}
                  ${bold('Extension')}: ${inlineCodeBlock(extension)}
                  ${bold('Size')}: ${inlineCodeBlock(ByteConverter.convertBytes(attachment.size))}
                `))
            )
          }
        }
      }

      if(hasMediaURLs) {
        if(!firstEmbedHasAttachment) {
          const firstURL = mediaURLs[0];
          const isURL = URL_REGEX.test(firstURL);
          const isTenorURL = TENOR_REGEX.test(firstURL);

          if(isURL && !isTenorURL) {
            firstEmbed.setImage(mediaURLs.shift());
          } else if(isURL && isTenorURL) {
            firstEmbed.addFields({
              name: 'Reason for missing media:',
              value: 'Can not display tenor URLs on embeds',
              inline: false
            });
          }
        }

        for(const url of mediaURLs) {
          if(URL_REGEX.test(url)) {
            const splitURL = url.split('.');
            const extension = splitURL.pop();
            const fileName = splitURL.join('.');

            const embed = new LogEmbed(3)
              .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })

            if(TENOR_REGEX.test(url)) {
              embed
                .setDescription(stripIndent(`
                  ${bold('Cannot display tenor URLs')}
                  ${bold('Tenor URL')}: ${inlineCodeBlock(url)}
                `))
            } else {
              embed
                .setImage(url)
                .setDescription(stripIndent(`
                  ${bold('Name')}: ${inlineCodeBlock(fileName)}
                  ${bold('Extension')}: ${inlineCodeBlock(extension)}
                `))
            }

            messageObject.embeds.push(embed);
          }
        }
      }

      if(hasMediaURLs || hasAttachments) {
        this.log(message.guildId, { embeds: [ firstEmbed, ...messageObject.embeds ], files: messageObject.files });
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event guildMemberRemove
   * @public
   * @async
   * @param {GuildMember} member
   * @returns {Promise<void>}
   */
  public async handleGuildMemberRemove(member: GuildMember): Promise<void> {
    try {
      const { guild } = member;
      const guildID = guild.id;

      const auditLogEntry = await this.findAuditLog(guild, AuditLogEvent.MemberKick);

      if(auditLogEntry?.target?.id === member.user.id) {
        const embed = new LogEmbed(2)
          .setAuthor({ name: `${member.user.tag} was just kicked by ${auditLogEntry.executor.tag}` })
          .setDescription(`${bold('Reason')}\n${codeBlock(auditLogEntry.reason || 'NO_REASON')}`)
          .setFooter({ text: 'Sometimes the user kicking is inaccurate as there is no new audit log entry' });

        this.log(guildID, { embeds: [ embed ] });
        this.assignAuditLogEntry(guildID, auditLogEntry);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles errors throughout the logger.
   * @private
   * @param {Error} err
   * @returns {never | void}
   */
  private handleError(err: Error): never | void {
    if(!this.verbose) {
      throw err;
    }

    console.error(err);
  }
}
