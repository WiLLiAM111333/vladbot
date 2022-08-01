import chalk from "chalk";
import { Awaitable } from "discord.js";
import { Event } from "../../lib/event/Event";
import { VladimirClient } from "../../lib/VladimirClient";

export default class extends Event<'ready'> {
  public constructor() {
    super('ready');
  }

  public callback(client: VladimirClient): Awaitable<void> {
    console.log(chalk`[{red BOT}] Logged in as {cyan ${client.user.tag}}`);
  }
}
