import { Awaitable, ClientEvents } from 'discord.js';
import { VladimirClient } from '../VladimirClient';

export abstract class Event<T extends keyof ClientEvents> {
  public name: T;
  public abstract callback(client: VladimirClient, ...args: ClientEvents[T]): Awaitable<void>;

  public constructor(name: T) {
    this.name = name;
  }
}
