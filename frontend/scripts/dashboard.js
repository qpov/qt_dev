// frontend/scripts/dashboard.js

// Функция отображения информации о пользователе
function showUserInfo(user) {
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('username').textContent = user.username || user.id;
}

// Функция скрытия информации о пользователе
function hideUserInfo() {
    document.getElementById('user-info').style.display = 'none';
}

// Запрос информации о текущем пользователе
fetch('/api/auth/user', { credentials: 'include' })
    .then(response => {
        if (response.status === 401) {
            console.log('Пользователь не авторизован');
            window.location.href = '/login'; // Перенаправление на страницу авторизации
        } else {
            return response.json();
        }
    })
    .then(user => {
        if (user) {
            showUserInfo(user);
            loadGuilds().then(() => {
                loadSettings(user.id);
            });
        }
    })
    .catch(console.error);

// Функция загрузки списка серверов (гильдий)
async function loadGuilds() {
    try {
        const response = await fetch('/api/guilds', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Ошибка при загрузке серверов');
        }
        const guilds = await response.json();
        const guildSelect = document.getElementById('guild-select');
        guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = guild.name;
            guildSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        alert('Не удалось загрузить серверы');
    }
}

// Обработчик изменения выбора сервера
document.getElementById('guild-select').addEventListener('change', async function () {
    const guildId = this.value;
    const channelSelect = document.getElementById('channel-select');
    channelSelect.innerHTML = '<option value="">--Выберите голосовой канал--</option>';

    if (guildId) {
        try {
            const response = await fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Ошибка при загрузке каналов');
            }
            const channels = await response.json();
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            alert('Не удалось загрузить голосовые каналы');
        }
    }
});

// Обработчик отправки формы настроек бота
document.getElementById('bot-settings-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const guildId = document.getElementById('guild-select').value;
    const voiceChannelId = document.getElementById('channel-select').value;

    if (!guildId || !voiceChannelId) {
        alert('Пожалуйста, выберите сервер и голосовой канал');
        return;
    }

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ guildId, voiceChannelId }),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const message = await response.text();
        const statusDiv = document.getElementById('settings-status');
        statusDiv.textContent = message;
        statusDiv.classList.remove('error');
        statusDiv.classList.add('success');

        // Переподключаемся к новому голосовому каналу без перезагрузки страницы
        // Опционально: Вы можете добавить здесь дополнительную логику
    } catch (error) {
        console.error(error);
        const statusDiv = document.getElementById('settings-status');
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.classList.remove('success');
        statusDiv.classList.add('error');
    }
});

// Обработчик кнопки выхода
document.getElementById('logout-button').addEventListener('click', async function () {
    try {
        await fetch('/api/auth/logout', { credentials: 'include' });
        hideUserInfo();
        window.location.href = '/'; // Перенаправление на главную страницу
    } catch (error) {
        console.error(error);
    }
});

// Функция загрузки текущих настроек пользователя
async function loadSettings(userId) {
    try {
        const response = await fetch('/api/settings', { credentials: 'include' });
        if (response.status === 404) {
            console.log('Настройки не найдены');
            return;
        } else if (!response.ok) {
            throw new Error('Ошибка при загрузке настроек');
        }
        const settings = await response.json();
        if (settings) {
            const guildSelect = document.getElementById('guild-select');
            const channelSelect = document.getElementById('channel-select');

            // Устанавливаем выбранный сервер
            guildSelect.value = settings.guildId;

            // Триггерим событие изменения, чтобы загрузить голосовые каналы
            const changeEvent = new Event('change');
            guildSelect.dispatchEvent(changeEvent);

            // Ждём загрузки каналов, затем устанавливаем выбранный голосовой канал
            // Используем MutationObserver для отслеживания добавления опций в channel-select
            const observer = new MutationObserver((mutationsList, observer) => {
                if (channelSelect.querySelector(`option[value="${settings.voiceChannelId}"]`)) {
                    channelSelect.value = settings.voiceChannelId;
                    observer.disconnect();
                }
            });

            observer.observe(channelSelect, { childList: true });
        }
    } catch (error) {
        console.error(error);
    }
}
