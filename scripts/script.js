// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Получение элементов
    const botStatus = document.getElementById('bot-status');
    const sendCommandButton = document.getElementById('send-command-button');
    const commandInput = document.getElementById('command-input');
    const commandResponse = document.getElementById('command-response');

    // Функция для получения статуса бота
    const fetchBotStatus = async () => {
        try {
            const response = await fetch('https://yourdomain.com/api/status');
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
            const response = await fetch('https://yourdomain.com/api/send-command', {
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

    // Инициализация
    fetchBotStatus();

    // Обработчик события нажатия кнопки
    sendCommandButton.addEventListener('click', sendCommand);
});
