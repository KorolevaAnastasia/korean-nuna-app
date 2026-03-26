const API_URL = '/api/words.php';

// Получить все слова
export async function fetchWords() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // [{ id, korean, russian, category }, ...]
}

// Добавить слово
export async function addWord(word) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { id, korean, russian, category }
}

// Обновить слово
export async function updateWord(id, word) {
    const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { ok: true }
}

// Удалить слово
export async function deleteWord(id) {
    const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // { ok: true }
}
