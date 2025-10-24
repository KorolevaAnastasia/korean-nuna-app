// src/utils/apiService.js
class ApiService {
    constructor() {
        // Для разработки используем относительный путь (прокси)
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            console.log('🔄 API запрос:', url);

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('❌ API request failed:', error);
            throw error;
        }
    }

    async getWords() {
        return this.request('/words');
    }

    async searchWords(query) {
        return this.request(`/words/search?q=${encodeURIComponent(query)}`);
    }

    async getWordsByCategory(category) {
        return this.request(`/words/category/${encodeURIComponent(category)}`);
    }

    async getCategories() {
        return this.request('/categories');
    }

    async addWord(word) {
        return this.request('/words', {
            method: 'POST',
            body: JSON.stringify(word),
        });
    }

    async updateWord(id, word) {
        return this.request(`/words/${id}`, {
            method: 'PUT',
            body: JSON.stringify(word),
        });
    }

    async deleteWord(id) {
        return this.request(`/words/${id}`, {
            method: 'DELETE',
        });
    }

    async getStats() {
        return this.request('/stats');
    }
}

export const apiService = new ApiService();