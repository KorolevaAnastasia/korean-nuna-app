// server/database.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'words.db');
        this.db = new sqlite3.Database(this.dbPath);
        console.log('📁 База данных подключена:', this.dbPath);
    }

    // Получить все слова
    getAllWords() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM words ORDER BY id", (err, rows) => {
                if (err) {
                    console.error('❌ Ошибка SQL запроса:', err);
                    reject(err);
                } else {
                    console.log(`📖 Загружено ${rows.length} слов из базы`);
                    resolve(rows);
                }
            });
        });
    }

    // Поиск слов
    searchWords(query) {
        return new Promise((resolve, reject) => {
            const searchSQL = `
                SELECT * FROM words 
                WHERE korean LIKE ? OR russian LIKE ? 
                ORDER BY id
            `;
            const searchTerm = `%${query}%`;
            this.db.all(searchSQL, [searchTerm, searchTerm], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Слова по категории
    getWordsByCategory(category) {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT * FROM words WHERE category = ? ORDER BY id", [category], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Все категории
    getCategories() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT DISTINCT category FROM words WHERE category IS NOT NULL ORDER BY category", (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.category));
            });
        });
    }

    // Добавить слово
    addWord(word) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO words (korean, russian, category) VALUES (?, ?, ?)`;
            this.db.run(sql, [word.korean, word.russian, word.category], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...word });
            });
        });
    }

    // Обновить слово
    updateWord(id, word) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE words 
                        SET korean = ?, russian = ?, category = ?
                        WHERE id = ?`;
            this.db.run(sql, [word.korean, word.russian, word.category, id], function(err) {
                if (err) reject(err);
                else resolve({ message: 'Слово обновлено', changes: this.changes });
            });
        });
    }

    // Удалить слово
    deleteWord(id) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM words WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve({ message: 'Слово удалено', changes: this.changes });
            });
        });
    }

    // Статистика
    getStats() {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(*) as totalWords,
                    COUNT(DISTINCT category) as totalCategories
                FROM words
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}