// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Получение элементов
    const botStatus = document.getElementById('bot-status');
    const sendCommandButton = document.getElementById('send-command-button');
    const commandInput = document.getElementById('command-input');
    const commandResponse = document.getElementById('command-response');

    const sendMessageButton = document.getElementById('send-message-button');
    const guildIdInput = document.getElementById('guild-id-input');
    const messageInput = document.getElementById('message-input');
    const messageResponse = document.getElementById('message-response');

    // Функция для получения статуса бота
    const fetchBotStatus = async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            botStatus.textContent = data.status;
        } catch (error) {
            botStatus.textContent = 'Ошибка при получении статуса';
            console.error(error);
        }
    };

    // Функция для отправки команды боту
    const sendCommand = async () => {
        const command = commandInput.value.trim();
        if (!command) {
            alert('Пожалуйста, введите команду');
            return;
        }

        try {
            const response = await fetch('/api/send-command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command }),
            });

            const data = await response.json();
            if (data.success) {
                commandResponse.textContent = 'Команда успешно отправлена!';
                commandInput.value = '';
            } else {
                commandResponse.textContent = `Ошибка: ${data.error}`;
            }
        } catch (error) {
            commandResponse.textContent = 'Ошибка при отправке команды';
            console.error(error);
        }
    };

    // Функция для отправки сообщения в определенный сервер
    const sendMessage = async () => {
        const guildId = guildIdInput.value.trim();
        const message = messageInput.value.trim();

        if (!guildId || !message) {
            alert('Пожалуйста, введите Guild ID и сообщение');
            return;
        }

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guildId, message }),
            });

            const data = await response.json();
            if (data.success) {
                messageResponse.textContent = 'Сообщение успешно отправлено!';
                guildIdInput.value = '';
                messageInput.value = '';
            } else {
                messageResponse.textContent = `Ошибка: ${data.error}`;
            }
        } catch (error) {
            messageResponse.textContent = 'Ошибка при отправке сообщения';
            console.error(error);
        }
    };

    // Инициализация
    fetchBotStatus();

    // Обработчики событий нажатия кнопок
    sendCommandButton.addEventListener('click', sendCommand);
    sendMessageButton.addEventListener('click', sendMessage);
});
