import { Awaitable, Role } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'roleUpdate'> {
  public constructor() {
    super('roleUpdate');
  }

  public callback(client: VladimirClient, oldRole: Role, newRole: Role): Awaitable<void> {
    client.moderationLogger.handleRoleUpdate(oldRole, newRole);
  }
}

