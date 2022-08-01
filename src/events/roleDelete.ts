import { Awaitable, Role } from "discord.js";
import { VladimirClient } from "../../lib/VladimirClient";
import { Event } from "../../lib/event/Event";

export default class extends Event<'roleDelete'> {
  public constructor() {
    super('roleDelete');
  }

  public callback(client: VladimirClient, role: Role): Awaitable<void> {
    client.moderationLogger.handleRoleDelete(role);
  }
}

