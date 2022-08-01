import stripIndent from 'strip-indent';
import { Constants } from '../../src/utils/constants';
import { Util } from '../../src/utils';
import { VladimirClient } from '../VladimirClient';
import { LogEmbed } from './LogEmbed';
import { ResolvedChannelTypeUnion } from './ResolvedChannelTypeUnion';
import { ModerationLoggerConfigManager } from './config/ModerationLoggerConfigManager';
import { DiscordFormatter } from '../formatter/DiscordFormatter';
import { ByteConverter } from '../converter/ByteConverter';
import { Stream } from 'stream';
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
  OverwriteType,
  GuildMember,
  BufferResolvable,
  JSONEncodable,
  APIAttachment,
  Attachment,
  AttachmentBuilder,
  AttachmentPayload
} from 'discord.js';

const { discordSupportedMedias, Environments } = Constants;
const { bold, cursive, inlineCodeBlock, codeBlock } = DiscordFormatter;

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

  public constructor(client: VladimirClient) {
    this.client = client;
    this.auditLogs = new Map<Snowflake, Snowflake>(); // Memory leak needs cleaning up
    this.verbose = process.env.NODE_ENV === Environments.DEVELOPMENT;
    this.configManager = new ModerationLoggerConfigManager();
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

    this.auditLogs.delete(guildID);

    return log;
  }

  /**
   * @description Assigns `lastAuditLogID` to the id log id if it exists. (nice very coherent william)
   * @private
   * @param {Snowflake} guildID
   * @param {GuildAuditLogsEntry} log
   * @returns {void}
   */
  private assignAuditLogEntry<TAction extends AuditLogEvent, TActionType extends 'Update' | 'Create' | 'Delete', TTargetType extends GuildAuditLogsTargetType>(guildID: Snowflake, log: GuildAuditLogsEntry<TAction, TActionType, TTargetType>): void {
    this.auditLogs.set(guildID, log?.id ?? this.auditLogs.get(guildID));
  }

  /**
   * @description Checks if a member is timed out and converts it to a boolean value
   * @private
   * @param {GuildMember} member
   * @returns {boolean}
   */
  private isTimedOut(member: GuildMember): boolean {
    return !!member.communicationDisabledUntilTimestamp;
  }

  /**
   * @description Logs to webhook and nothing else
   * @private
   * @async
   * @param {Snowflake} guildID
   * @param {LogEmbed} embed
   */
  private async log(guildID: Snowflake, embed: LogEmbed | Array<LogEmbed>, files?: Array<BufferResolvable | Stream | JSONEncodable<APIAttachment> | Attachment | AttachmentBuilder | AttachmentPayload>): Promise<void> {
    try {
      const hook = await this.getWebHook(guildID);

      if(!hook) {
        return;
      }

      if(Array.isArray(embed)) {
        hook.send({ embeds: [ ...embed ], files: files ? files : [] });
      } else {
        hook.send({ embeds: [ embed ], files: files ? files : [] });
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
   * @returns {Promise<Webhook>}
   */
  private async getWebHook(guildID: Snowflake): Promise<Webhook> {
    try {
      const cfg = await this.configManager.get(guildID);

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
    const { type: rawType, name, guildId } = channel;

    if([ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM].includes(rawType)) { // Ignore threads and DMs
      return;
    }

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

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

      this.log(guildId, embed);

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
    const { type: rawType, name , guildId} = channel;

    if([ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM].includes(rawType)) { // Ignore threads and DMs
      return;
    }

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

      const type = this.convertDJSType(channel);
      const tag = this.getTagFromAuditLog(auditLogEntry);

      const authorStr = type === 'Category'
        ? `Category "${name}" has been deleted by ${tag}`
        : `${type} channel "${name}" has been deleted by ${tag}`;

      const embed = new LogEmbed(1)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) });

      this.log(guildId, embed)

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
    if([ChannelType.GuildPrivateThread, ChannelType.GuildPublicThread, ChannelType.GuildNewsThread, ChannelType.DM].includes(oldChannel.type)) { // Ignore threads and DMs
      return;
    }

    if(oldChannel.position !== newChannel.position || oldChannel.rawPosition !== newChannel.rawPosition) { // Lets avoid spamming the API shall we
      return;
    }

    // I dont like it either 😫
    const { guildId } = oldChannel;

    const diff = [];

    try {
      const auditLogs = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

      const oldChPerms = [...oldChannel.permissionOverwrites.cache];
      const newChPerms = [...newChannel.permissionOverwrites.cache];

      if(oldChPerms.length < newChPerms.length) { // A new override was created.
        const newOverride = newChPerms[newChPerms.length -1][1];

        if(newOverride.type === OverwriteType.Member) {
          const { tag } = newChannel.guild.members.resolve(newOverride.id).user;

          diff[diff.length] = `Added an override for ${inlineCodeBlock(tag)}`;
        } else {
          const { name } = newChannel.guild.roles.resolve(newOverride.id);

          diff[diff.length] = `Added an override for ${inlineCodeBlock(name)}`;
        }
      } else if(oldChPerms.length > newChPerms.length) { // A permission override was removed.
        const removedOverride = oldChPerms.reduce((_, override) => {
          if(!newChPerms.includes(override)) {
            return override;
          }
        })[1];

        if(removedOverride.type === OverwriteType.Member) {
          const { tag } = newChannel.guild.members.resolve(removedOverride.id).user;

          diff[diff.length] = `Removed an override for ${inlineCodeBlock(tag)}`;
        } else {
          const { name } = newChannel.guild.roles.resolve(removedOverride.id)

          diff[diff.length] = `Removed an override for ${inlineCodeBlock(name)}`;
        }
      } else { // An override was edited, oldChPerms and newChPerms length are equal.
        for(let i = 0; i < oldChPerms.length; i++) {
          const oldPerms = oldChPerms[i][1];
          const newPerms = newChPerms[i][1];

          if(oldPerms.allow.bitfield !== newPerms.allow.bitfield || oldPerms.deny.bitfield !== newPerms.deny.bitfield) {
            // I dont like it this time either 😢
            const permArr = [];
            const logPermArr = [];

            const { type } = newPerms;
            const name = newPerms.type === OverwriteType.Member
              ? newChannel.guild.members.resolve(newPerms.id).user.tag
              : newChannel.guild.roles.resolve(newPerms.id).name;

            const oldAllow = oldPerms.allow.serialize(true);
            const oldDeny = oldPerms.deny.serialize(true);

            const newAllow = newPerms.allow.serialize(true);
            const newDeny = newPerms.deny.serialize(true);

            for(const key in newAllow) {
              const formattedPermissionKey = this.formatRawDJSPermissionString(key as PermissionsString);

              const isNewAllowed = newAllow[key];
              const isOldAllowed = oldAllow[key];

              const isNewDenied = newDeny[key];
              const isOldDenied = oldDeny[key];

              // I hope no one sees this ^_^
              if(isNewDenied && !isOldDenied && isOldAllowed) { // Allowed to denied
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ✅ to ❌`;
              } else if(!isNewAllowed && !isNewDenied && isOldAllowed) { // Allowed to neutral
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ✅ to ➖`;
              } else if(isNewAllowed && !isOldAllowed && isOldDenied) { // Denied to allowed
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ❌ to ✅`;
              } else if(!isNewAllowed && !isNewDenied && isOldDenied) { // Denied to neutral
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ❌ to ➖`;
              } else if(isNewAllowed && !isOldAllowed && !isOldDenied) { // Neutral to Allowed
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ➖ to ✅`;
              } else if(isNewDenied && !isOldDenied && !isOldAllowed) { // Neutral to denied
                permArr[permArr.length] = `Set ${inlineCodeBlock(formattedPermissionKey)} from ➖ to ❌`;
              }
            }

            diff[diff.length] = `Changed permissions for the ${type} ${inlineCodeBlock(name)}:\n  - ${permArr.join('\n  - ')}`;
          }
        }
      }

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

          if(((oldTopic?.length ?? 0) + (newTopic?.length ?? 0) + Util.getCombinedStringArrayLength(diff)) <= 4082 - (3 * diff.length)) {
            diff[diff.length] = `Topic changed from:\n"${cursive(oldTopic)}" to:\n"${cursive(newTopic)}"`;
          }
        }

        if(oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
          const diffStr = `Set slowmode to ${bold(newChannel.rateLimitPerUser)} seconds from ${bold(oldChannel.rateLimitPerUser)}`;

          if(diffStr.length + Util.getCombinedStringArrayLength(diff) < 4096 - (3 * diff.length)) {
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
        .setDescription(diff.join(`\n`));

      this.log(guildId, embed);

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

      const auditLogs = await emote.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      const description = `${emote.animated ? bold('Requires Nitro\n') : ''}`;

      const author = emote.author
        ?? await emote.fetchAuthor()
        ?? auditLogEntry.executor;

      const authorStr = `The emote "${name}" has been created by ${author.tag}`;

      const embed = new LogEmbed(0)
        .setAuthor({ name: authorStr, iconURL: author.displayAvatarURL() })
        .setImage(url)
        .setDescription(description);

      this.log(guildID, embed);

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
      const auditLogs = await emote.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));
      const tag = this.getTagFromAuditLog(auditLogEntry);

      const authorStr = `The emote "${name}" has been deleted by ${tag}`;

      const embed = new LogEmbed(1)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setImage(url);

      this.log(guildID, embed);

      this.assignAuditLogEntry(guildID, auditLogEntry);
    } catch(err) {
      if(err.code === 10014 && err.httpStataus === 404) {
        const embed = new LogEmbed(2)
          .setDescription('An emote was deleted but I was unable to retrieve any information about it!');

        this.log(guildID, embed);
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

      const auditLogs = await oldEmote.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      if(oldName !== newName) {
        const tag = this.getTagFromAuditLog(auditLogEntry);

        const authorStr = `The emote "${oldName}" has been re-named to "${newName}" by ${tag}`;

        const embed = new LogEmbed(0)
          .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
          .setImage(newEmote.url);

        this.log(guildID, embed);

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

      const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const parsedReason = reason ?? auditLogEntry?.reason ?? 'No Reason Set';

      const authorStr = `"${user.tag}" was banned for "${parsedReason}" by ${tag}`;

      const embed = new LogEmbed(2)
        .setAuthor({ name: authorStr })

      this.log(guildID, embed);

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

      const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      const tag = this.getTagFromAuditLog(auditLogEntry);
      const authorStr = `"${user.tag}" has been un-banned by ${tag}`;

      const embed = new LogEmbed(2)
        .setAuthor({ name: authorStr, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(`They were originally banned for the following reason:\n${bold(`"${reason ?? auditLogEntry?.reason ?? 'No Reason Set'}"`)}`);

      this.log(guildID, embed);

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

      const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

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

      this.log(guildID, embed);

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

      const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      const embed = new LogEmbed(0)
        .setAuthor({ name: `The role "${name}" was just deleted by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(stripIndent(`
          ${bold('Color')}: ${inlineCodeBlock(hexColor)}
          ${bold('Hoist')}: ${inlineCodeBlock(formattedHoist)}
          ${bold('Mentionable')}: ${inlineCodeBlock(formattedMentionable)}
          ${bold('ID')}: ${inlineCodeBlock(id)}
        `));

      this.log(guildID, embed);

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

      const auditLogs = await oldRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

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
          .map(str => str.length >= 35 ? `${str}\n` : str)
          .join('\n')
        );

      this.log(guildID, embed);

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
      const { name, format, url, id, description, guildId } = sticker;

      const auditLogs = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerCreate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

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

      this.log(guildId, embed);

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
      const { name: oldName, description: oldDescription, guildId } = oldSticker;
      const { name: newName, description: newDescription } = newSticker;

      let count = 0;
      const diff = [];

      const auditLogs = await oldSticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerUpdate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

      if(oldName !== newName) {
        diff[count++] = `Changed name from ${bold(oldName)} to ${bold(newName)}`;
      }

      if(oldDescription !== newDescription) {
        diff[count++] = `Changed description:\n${cursive(`"${oldDescription}"`)}\n${cursive(`"${newDescription}"`)}`;
      }

      const embed = new LogEmbed(1)
        .setAuthor({ name: `The sticker "${oldSticker.name}" was just edited by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(diff
          .map(str => str.length >= 35 ? `${str}\n` : str)
          .join('\n')
        );

      this.log(guildId, embed);

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
    const { name, format, id, description, guildId } = sticker;

    try {
      const auditLogs = await sticker.guild.fetchAuditLogs({ type: AuditLogEvent.StickerDelete });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildId));

      const embed = new LogEmbed(1)
        .setAuthor({ name: `The sticker "${name}" was just deleted by ${this.getTagFromAuditLog(auditLogEntry)}`, iconURL: this.getAvatarFromAuditLog(auditLogEntry) })
        .setDescription(stripIndent(`
          ${bold('Format')}: ${inlineCodeBlock(format)}
          ${bold('ID')}: ${inlineCodeBlock(id)}
          ${bold('Description')}: ${inlineCodeBlock(description)}
        `));

      this.log(guildId, embed);

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
  public handleMessageDelete(message: Message): void {
    this.configManager.get(message.guildId).then(cfg => {
      // idk how it wouldnt be a textchannel but hey ho lets keep it
      if(message.channel.id === cfg.logChannelID || !(message.channel instanceof TextChannel) || !message.guild) return;

      const embed = new LogEmbed(0)
        .setAuthor({ name: `Deleted message from ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setDescription(`${bold('Channel')}: ${inlineCodeBlock(message.channel.name)}`)
        .addFields({ name: 'Content', value: message.content || 'NO_CONTENT', inline: false });

      this.log(message.guildId, embed);
    }).catch(this.handleError);
  }

  /**
   * @description Handles the event messageCreate
   * @public
   * @async
   * @param {Message} message
   * @returns {Promise<void>}
   */
  public async handleMessageCreate(message: Message): Promise<void> {
    try {
      const hasAttachments = !!(message.attachments.size);
      const messageObject = { embeds: [], files: [] };

      if(hasAttachments) {
        const firstAttachment = message.attachments.first();
        const firstIsSafe = discordSupportedMedias.includes(firstAttachment.name.split('.')[1]);

        if(firstIsSafe) {
          messageObject.files.push(firstAttachment);
          message.attachments.delete(firstAttachment.id);
        }

        for(const [ attachmentID, attachment ] of message.attachments) {
          const [ name, extension ] = attachment.name.split('.');
          const isSupportedMedia = discordSupportedMedias.includes(extension);

          if(isSupportedMedia) {
            messageObject.embeds.push(
              new LogEmbed(3)
                .setImage(`attachment://${attachment.name}`)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            )
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

        const embed = new LogEmbed(1)
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
          .setDescription(stripIndent(`
            ${bold('Author')}: ${inlineCodeBlock(message.author.tag)}
            ${bold('Content')}:

            ${message.content || 'NO_CONTENT'}
          `))
          .setFooter({ text: 'Potentially malicious files are listed below in embeds if present' })

        if(firstIsSafe) {
          embed.setImage(`attachment://${firstAttachment.name}`);
        }

        this.log(message.guildId, [ embed, ...messageObject.embeds ], messageObject.files);
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
      const guildID = member.guild.id;

      const auditLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      if(auditLogEntry.target.id === member.user.id) {
        const embed = new LogEmbed(2)
          .setAuthor({ name: `${member.user.tag} was just kicked by ${auditLogEntry.executor.tag}` })
          .setDescription(`${bold('Reason')}\n${codeBlock(auditLogEntry.reason)}`);

        this.log(guildID, embed);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  /**
   * @description Handles the event guildMemberUpdate
   * @public
   * @async
   * @param {GuildMember} oldMember
   * @param {GuildMember} newMember
   */
  public async handleGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    try {
      const guildID = oldMember.guild.id;

      const wasTimedOut = this.isTimedOut(oldMember);
      const isNowTimedOut = this.isTimedOut(newMember);

      const auditLogs = await oldMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate });
      const auditLogEntry = auditLogs.entries.find(log => log.id !== this.getLastAuditLogID(guildID));

      if(!wasTimedOut && isNowTimedOut) {
        const embed = new LogEmbed(1)
          .setAuthor({ name: `${oldMember.user.tag} was timed out by ${auditLogEntry.executor} until ${auditLogEntry} for the reason:` })
          .setDescription(auditLogEntry.reason ?? 'NO_REASON_PROVIDED');

        this.log(guildID, embed);
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
