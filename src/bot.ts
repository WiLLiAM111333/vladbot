import { VladimirClient } from '../lib/VladimirClient';
import { Constants } from './utils/constants';

const { Environments } = Constants;

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

if(process.env.NODE_ENV === Environments.DEVELOPMENT) {
  client.login(process.env.TOKEN_DEV);
} else {
  client.login(process.env.TOKEN);
}
