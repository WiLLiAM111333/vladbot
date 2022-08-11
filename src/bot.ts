import { VladimirClient } from '../lib/VladimirClient';
import { Util } from './utils';

const { isProduction } = Util;

const client = new VladimirClient({
  intents: [
    'Guilds',
    'GuildMembers',
    'GuildBans',
    'GuildEmojisAndStickers',
    'GuildIntegrations',
    'GuildWebhooks',
    'GuildInvites',
    'GuildMessages',
    'GuildIntegrations',
    'MessageContent'
  ]
});

if(isProduction()) {
  client.login(process.env.TOKEN);
} else {
  client.login(process.env.TOKEN_DEV);
}
