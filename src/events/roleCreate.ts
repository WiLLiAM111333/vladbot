import { Awaitable, Role } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'roleCreate'> {
  public constructor() {
    super('roleCreate');
  }

  public callback(client: VladimirClient, role: Role): Awaitable<void> {
    client.moderationLogger.handleRoleCreate(role);
  }
}

