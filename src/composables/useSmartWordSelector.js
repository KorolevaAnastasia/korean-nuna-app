import { computed, ref } from 'vue';

export function useSmartWordSelector(words) {
    const probabilities = ref({
        1: 0.50,
        2: 0.25,
        3: 0.15,
        4: 0.07,
        5: 0.03
    });

    const wordsByLevel = computed(() => {
        const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        if (!words.value || words.value.length === 0) return grouped;
        words.value.forEach(word => {
            const level = word.level || 1;
            (grouped[level] || grouped[1]).push(word);
        });
        return grouped;
    });

    const selectLevel = () => {
        const random = Math.random();
        let cumulative = 0;
        for (let level = 1; level <= 5; level++) {
            cumulative += probabilities.value[level];
            if (random <= cumulative) return level;
        }
        return 1;
    };

    // Получить слово с наименьшим score из уровня, исключая уже использованные
    const getWordWithLowestScore = (level, usedIds) => {
        const wordsInLevel = wordsByLevel.value[level].filter(w => !usedIds.has(w.id));
        if (wordsInLevel.length === 0) {
            for (let next = level + 1; next <= 5; next++) {
                const available = wordsByLevel.value[next].filter(w => !usedIds.has(w.id));
                if (available.length > 0) return available.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
            }
            for (let prev = level - 1; prev >= 1; prev--) {
                const available = wordsByLevel.value[prev].filter(w => !usedIds.has(w.id));
                if (available.length > 0) return available.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
            }
            return null;
        }
        return wordsInLevel.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    };

    // count = null означает "все слова" — умный выбор применяется всегда
    const getSessionWords = (count = null) => {
        if (!words.value || words.value.length === 0) return [];

        const total = words.value.length;
        const sessionSize = count === null ? total : Math.min(count, total);
        const usedIds = new Set();
        const session = [];

        // Сначала добавляем слова которые никогда не повторялись
        const neverReviewed = words.value.filter(w => !w.last_reviewed)
            .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));

        for (const word of neverReviewed) {
            if (session.length >= sessionSize) break;
            session.push(word);
            usedIds.add(word.id);
        }

        // Добираем остаток умным выбором по вероятностям
        let attempts = 0;
        while (session.length < sessionSize && attempts < sessionSize * 5) {
            attempts++;
            const level = selectLevel();
            const word = getWordWithLowestScore(level, usedIds);
            if (!word) break;
            session.push(word);
            usedIds.add(word.id);
        }

        // Если всё ещё не хватает — добиваем случайными
        if (session.length < sessionSize) {
            const remaining = words.value
                .filter(w => !usedIds.has(w.id))
                .sort(() => Math.random() - 0.5);
            session.push(...remaining.slice(0, sessionSize - session.length));
        }

        return session;
    };

    return { probabilities, wordsByLevel, selectLevel, getSessionWords };
}