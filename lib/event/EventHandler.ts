import { VladimirClient } from "../VladimirClient";
import { join } from 'path';
import { readdir} from 'fs/promises';
import { Event } from "./Event";
import { ClientEvents } from "discord.js";

export class EventHandler {
  private client: VladimirClient;

  public constructor(client: VladimirClient) {
    this.client = client;
  }

  public async loadEvents(): Promise<void> {
    try {
      const eventPath = join(__dirname, '..', '..', '..', 'dist', 'src', 'events');
      const files = await readdir(eventPath);

      for(const file of files) {
        const eventFile = join(eventPath, file);

        const { default: EventClass } = await import(eventFile);
        const event: Event<keyof ClientEvents> = new EventClass();

        this.client.on(event.name, event.callback.bind(null, this.client));
      }
    } catch (err) {
      this.client.emit('error', err);
    }
  }
}
