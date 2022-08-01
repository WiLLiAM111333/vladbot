import { VladimirClient } from '../lib/VladimirClient';

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

client.login(process.env.TOKEN);
