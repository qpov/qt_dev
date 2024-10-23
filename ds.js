const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes } = require('discord.js');

// Инициализация клиента Discord с необходимыми интентами
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Токен бота и правильный Client ID
const BOT_TOKEN = 'MTIwNDY0MzYwMTc3MTEzNTA0Nw.Gp0bzp.W4Iy_4tF8i_tUJ4tvelpKQ6IuKSyDOJsOqUYbU';  
const CLIENT_ID = '1204643601771135047';

// ID голосового канала, к которому нужно подключаться для создания новых каналов
const CREATE_ROOM_CHANNEL_ID = '1298660053250867354';  // Замените на ID вашего канала

// Объект для хранения созданных ботом каналов
const createdChannels = new Set();

// Регистрация слэш-команд
const commands = [
    {
        name: 'cheater',
        description: 'Отметить пользователя 657183023787409428 как читера!',
    },
];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log('Начинаем регистрацию слэш-команд.');
        
        // Регистрация команд для всех гильдий (серверов)
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Успешно зарегистрированы слэш-команды.');
    } catch (error) {
        console.error('Ошибка при регистрации команд:', error);
    }
})();

// Когда бот готов и подключён
client.once('ready', async () => {
    console.log(`Бот ${client.user.tag} подключен и готов к работе!`);
});

// Обработка слэш-команды /cheater
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'cheater') {
        try {
            // Задерживаем ответ, чтобы избежать тайм-аута
            await interaction.deferReply();

            // Упоминание конкретного пользователя
            const userMention = `<@657183023787409428>`;  
            await interaction.editReply(`${userMention}, ты читер!`);  // Ответ с упоминанием пользователя
            console.log(`Пользователь с ID 657183023787409428 был отмечен как читер.`);
        } catch (error) {
            console.error('Ошибка при выполнении команды /cheater:', error);
            await interaction.editReply('Произошла ошибка при выполнении команды.');
        }
    }
});

// Обработка изменений голосового состояния
client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild;
    const member = newState.member;

    // Проверяем, что пользователь подключился к каналу "Создать комнату"
    if (newState.channelId && newState.channelId === CREATE_ROOM_CHANNEL_ID) {
        const newChannel = await guild.channels.create({
            name: member.user.username,
            type: 2, // Тип: голосовой канал
            parent: newState.channel.parent, // Устанавливаем ту же категорию, что и у исходного канала
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionsBitField.Flags.Connect],
                }
            ]
        });

        // Добавляем созданный канал в Set
        createdChannels.add(newChannel.id);
        console.log(`Создан новый канал: ${newChannel.name} (${newChannel.id})`);

        // Перемещаем пользователя в созданный канал
        await member.voice.setChannel(newChannel);
    }

    // Проверяем, если пользователь вышел из канала
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;

        // Проверяем, что канал был создан ботом и что канал пуст
        if (oldChannel && createdChannels.has(oldChannel.id) && oldChannel.members.size === 0) {
            await oldChannel.delete();
            createdChannels.delete(oldChannel.id);
            console.log(`Канал ${oldChannel.name} (${oldChannel.id}) был удален, так как он пуст.`);
        }
    }
});

// Логин с использованием токена бота
client.login(BOT_TOKEN);
