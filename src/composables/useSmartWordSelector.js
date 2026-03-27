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

    // Берём случайное слово из топ-3 с наименьшим score (рандом внутри уровня)
    const getWordFromLevel = (level, usedIds) => {
        const available = wordsByLevel.value[level].filter(w => !usedIds.has(w.id));

        if (available.length === 0) {
            // Ищем в других уровнях
            for (let next = level + 1; next <= 5; next++) {
                const a = wordsByLevel.value[next].filter(w => !usedIds.has(w.id));
                if (a.length > 0) return pickFromTop(a);
            }
            for (let prev = level - 1; prev >= 1; prev--) {
                const a = wordsByLevel.value[prev].filter(w => !usedIds.has(w.id));
                if (a.length > 0) return pickFromTop(a);
            }
            return null;
        }

        return pickFromTop(available);
    };

    // Берём случайное слово из топ-3 кандидатов с наименьшим score
    const pickFromTop = (available) => {
        const sorted = [...available].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
        const topN = Math.min(3, sorted.length);
        const topCandidates = sorted.slice(0, topN);
        return topCandidates[Math.floor(Math.random() * topCandidates.length)];
    };

    const getSessionWords = (count = null) => {
        if (!words.value || words.value.length === 0) return [];

        const total = words.value.length;
        const sessionSize = count === null ? total : Math.min(count, total);
        const usedIds = new Set();
        const session = [];

        // Сначала новые слова (никогда не повторялись) — с рандомом внутри группы
        const neverReviewed = words.value
            .filter(w => !w.last_reviewed)
            .sort(() => Math.random() - 0.5); // рандомный порядок для новых слов

        for (const word of neverReviewed) {
            if (session.length >= sessionSize) break;
            session.push(word);
            usedIds.add(word.id);
        }

        // Добираем умным выбором по вероятностям уровней
        let attempts = 0;
        while (session.length < sessionSize && attempts < sessionSize * 5) {
            attempts++;
            const level = selectLevel();
            const word = getWordFromLevel(level, usedIds);
            if (!word) break;
            session.push(word);
            usedIds.add(word.id);
        }

        // Добиваем случайными если не хватает
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