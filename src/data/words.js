import { fetchWords } from '../utils/apiService.js';

// Получить слова из базы данных
export async function getKoreanWords() {
    try {
        const words = await fetchWords();
        if (words && words.length > 0) {
            return words;
        }
        return [];
    } catch (error) {
        console.error('Ошибка загрузки слов из API:', error);
        return [];
    }
}

export let koreanWords = [];

export async function initializeWords() {
    koreanWords = await getKoreanWords();
    return koreanWords;
}