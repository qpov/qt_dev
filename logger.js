// logger.js
const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Путь к папке logs
const logsDir = path.join(__dirname, 'logs');

// Проверка существования папки logs, если нет — создаём её
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Папка "logs" создана по пути: ${logsDir}`);
}

// Настройка формата логов
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} [${level}]: ${message} - ${stack}`
                : `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        // Логи ошибок
        new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
        // Все логи
        new transports.File({ filename: path.join(logsDir, 'combined.log') }),
    ],
});

// Если не в продакшене, выводим логи в консоль
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, stack }) => {
                return stack
                    ? `${timestamp} [${level}]: ${message} - ${stack}`
                    : `${timestamp} [${level}]: ${message}`;
            })
        )
    }));
}

module.exports = logger;
