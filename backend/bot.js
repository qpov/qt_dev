// backend/bot.js
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const settings = require('./settings');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const userSettings = settings.getUserSettings(userId);

    if (!userSettings) return;

    const { guildId, voiceChannelId } = userSettings;

    // Проверяем, присоединился ли пользователь к выбранному голосовому каналу
    if (newState.channelId === voiceChannelId && oldState.channelId !== voiceChannelId) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;

        // Получаем категорию выбранного канала
        const category = newState.channel.parent;

        try {
            // Создаём новый голосовой канал с именем пользователя
            const newChannel = await guild.channels.create({
                name: `${member.user.username}'s Channel`,
                type: ChannelType.GuildVoice,
                parent: category ? category.id : undefined,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
                    },
                ],
            });

            console.log(`Создан канал ${newChannel.name} для пользователя ${member.user.tag}`);

            // Добавляем канал в управляемые
            settings.addManagedChannel(newChannel.id);

            // Перемещаем пользователя в новый канал
            await member.voice.setChannel(newChannel);
        } catch (error) {
            console.error('Ошибка при создании или перемещении канала:', error);
        }
    }

    // Проверяем, если канал управляется ботом и стал пустым
    if (oldState.channelId && settings.isManagedChannel(oldState.channelId)) {
        const channel = oldState.channel;
        if (channel.members.size === 0) {
            try {
                await channel.delete();
                settings.removeManagedChannel(channel.id);
                console.log(`Удалён пустой канал ${channel.name}`);
            } catch (error) {
                console.error('Ошибка при удалении канала:', error);
            }
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);

module.exports = client;
