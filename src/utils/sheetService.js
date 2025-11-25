export class SheetService {
    constructor(sheetUrl) {
        this.sheetUrl = sheetUrl;
        this.cacheKey = 'koreanWordsCache';
        this.cacheTimeout = 30 * 60 * 1000; // 30 минут
    }

    async fetchWords() {
        try {
            console.log('Загрузка слов из Google Sheets...');

            const response = await fetch(this.sheetUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const tsvData = await response.text();
            return this.parseTSV(tsvData);
        } catch (error) {
            console.error('Ошибка загрузки из Sheets:', error);
            return this.getCachedWords();
        }
    }

    parseTSV(tsvData) {
        const lines = tsvData.trim().split('\n');
        const headers = lines[0].split('\t').map(header => header.trim());

        const words = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t').map(value => value.trim());

            if (values.length >= 4) {
                const word = {
                    id: parseInt(values[0]) || i,
                    korean: values[1] || '',
                    russian: values[2] || '',
                    category: values[3] || 'Не указано'
                };

                // Проверяем, что слово не пустое
                if (word.korean && word.russian) {
                    words.push(word);
                }
            }
        }

        // Сохраняем в кеш
        this.cacheWords(words);

        return words;
    }

    cacheWords(words) {
        const cacheData = {
            words: words,
            timestamp: Date.now()
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    }

    getCachedWords() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const isExpired = Date.now() - cacheData.timestamp > this.cacheTimeout;

            if (!isExpired && cacheData.words && cacheData.words.length > 0) {
                console.log('Используем кешированные слова');
                return cacheData.words;
            }
        } catch (error) {
            console.error('Ошибка чтения кеша:', error);
        }

        return null;
    }

    // Метод для получения слов (основной интерфейс)
    async getWords() {
        // Пытаемся загрузить из интернета
        const onlineWords = await this.fetchWords();
        if (onlineWords && onlineWords.length > 0) {
            return onlineWords;
        }

        // Если не получилось, используем кеш
        const cachedWords = this.getCachedWords();
        if (cachedWords && cachedWords.length > 0) {
            return cachedWords;
        }

        // Если всё плохо, возвращаем null для использования fallback
        return null;
    }
}

// URL вашего Google Sheets в TSV формате
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPlhu0BzctyNmImAU2rdcmSaBSnFw41KGVmgWnMYpqXz1iX6kvpGCoBD-evnjWOw2lWb3GThnxPql2/pub?gid=0&single=true&output=tsv';

export const sheetService = new SheetService(SHEET_URL);