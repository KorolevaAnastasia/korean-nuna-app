const API_URL = '/api/words.php';

export async function fetchWords() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function addWord(word) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function updateWord(id, word) {
    const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function deleteWord(id) {
    const res = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function updateWordStats(wordId, isCorrect, currentWord) {
    let newScore = currentWord.score ?? 0;
    let newLevel = currentWord.level ?? 1;
    let newConsecutive = currentWord.consecutive_correct ?? 0;

    if (isCorrect) {
        newScore = Math.min(newScore + 1, 10);
        newConsecutive += 1;
        if (newConsecutive >= 3 && newLevel < 5) {
            newLevel += 1;
            newConsecutive = 0;
        }
    } else {
        newScore = Math.max(newScore - 2, 0);
        newConsecutive = 0;
        if (newScore <= 3 && newLevel > 1) {
            newLevel -= 1;
        }
    }

    const updatedWord = {
        ...currentWord,
        score: newScore,
        level: newLevel,
        consecutive_correct: newConsecutive,
        last_reviewed: new Date().toISOString().split('T')[0],
    };

    await updateWord(wordId, {
        korean:              updatedWord.korean,
        russian:             updatedWord.russian,
        category:            updatedWord.category,
        score:               updatedWord.score,
        level:               updatedWord.level,
        consecutive_correct: updatedWord.consecutive_correct,
        last_reviewed:       updatedWord.last_reviewed,
    });

    return updatedWord;
}