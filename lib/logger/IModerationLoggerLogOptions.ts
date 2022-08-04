import { Stream } from "stream";
import { LogEmbed } from "./LogEmbed";
import {
  APIAttachment,
  Attachment,
  AttachmentBuilder,
  AttachmentPayload,
  BufferResolvable,
  GuildMember,
  JSONEncodable,
  Role,
  Snowflake,
  User
} from "discord.js";

export interface IModerationLoggerLogOptions {
  embeds: Array<LogEmbed>;
  files?: Array<
    BufferResolvable
      | Stream
      | JSONEncodable<APIAttachment>
      | Attachment
      | AttachmentBuilder
      | AttachmentPayload
  >;
  pingModRole?: boolean;
}
