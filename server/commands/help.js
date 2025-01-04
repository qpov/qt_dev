// commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Получить информацию о доступных командах.'),
    async execute(interaction) {
        try {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Справка по Командам')
                .setDescription('Ниже приведён список доступных команд и их описание.')
                .addFields(
                    { name: '/clear', value: 'Удаляет все сообщения указанного пользователя в текущем канале.\n**Пример использования:**\n`/clear user: @пользователь`' },
                    { name: '/install', value: 'Устанавливает интерфейс для взаимодействия с ботом в указанном текстовом канале.\n**Пример использования:**\n`/install channel: #bot-commands`' },
                    { name: '/help', value: 'Получить информацию о доступных командах.' },
                )
                .setTimestamp()
                .setFooter({ text: `Запрошено ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [helpEmbed], ephemeral: false });

            console.log(`Пользователь ${interaction.user.tag} запросил справку по командам.`);
        } catch (error) {
            console.error('Ошибка при выполнении команды /help:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('Произошла ошибка при выполнении команды.');
            } else {
                await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
            }
        }
    },
};
