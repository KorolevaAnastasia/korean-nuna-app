import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './server/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://korean-nuna-app.vercel.app', 
        'https://*.vercel.app'
    ],
    credentials: true
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

const db = new Database();

app.get('/api/words', async (req, res) => {
    try {
        const words = await db.getAllWords();
        res.json(words);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения слов' });
    }
});

app.get('/api/words/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Параметр поиска (q) обязателен' });
        }
        const words = await db.searchWords(q);
        res.json(words);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/words/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const words = await db.getWordsByCategory(category);
        res.json(words);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/words', async (req, res) => {
    try {
        const { korean, russian, category } = req.body;

        if (!korean || !russian) {
            return res.status(400).json({ error: 'Корейское и русское слово обязательны' });
        }

        const newWord = await db.addWord({ korean, russian, category });
        res.status(201).json(newWord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/words/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { korean, russian, category } = req.body;

        const result = await db.updateWord(id, { korean, russian, category });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/words/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.deleteWord(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает!' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
