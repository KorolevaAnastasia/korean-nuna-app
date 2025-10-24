// server/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Инициализируем базу данных
const db = new Database();

// API routes - работаем только с базой данных
app.get('/api/words', async (req, res) => {
    try {
        const words = await db.getAllWords();
        res.json(words);
    } catch (error) {
        console.error('❌ Ошибка получения слов:', error);
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
        console.error('❌ Ошибка поиска:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/words/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const words = await db.getWordsByCategory(category);
        res.json(words);
    } catch (error) {
        console.error('❌ Ошибка получения слов по категории:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json(categories);
    } catch (error) {
        console.error('❌ Ошибка получения категорий:', error);
        res.status(500).json({ error: error.message });
    }
});

// CRUD операции
app.post('/api/words', async (req, res) => {
    try {
        const { korean, russian, category } = req.body;

        if (!korean || !russian) {
            return res.status(400).json({ error: 'Корейское и русское слово обязательны' });
        }

        const newWord = await db.addWord({ korean, russian, category });
        res.status(201).json(newWord);
    } catch (error) {
        console.error('❌ Ошибка добавления слова:', error);
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
        console.error('❌ Ошибка обновления слова:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/words/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.deleteWord(id);
        res.json(result);
    } catch (error) {
        console.error('❌ Ошибка удаления слова:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Сервер работает!' });
});
