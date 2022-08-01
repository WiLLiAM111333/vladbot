import 'discord.js';
import { VladimirClient } from './lib/VladimirClient';

declare module 'discord.js' {
  export interface Message {
    client: VladimirClient
  }
}
