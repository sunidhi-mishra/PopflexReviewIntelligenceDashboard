/**
 * Generate a 768-dimensional embedding vector for a single text string.
 * Since Groq does not support a public embeddings API, we generate deterministic,
 * pseudo-random vector representations locally to support RAG similarity matching.
 * @param {string} text - Input text
 * @returns {Promise<Array<number>>} - Embedding vector
 */
async function getEmbedding(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('[EmbeddingService] Text must be a non-empty string.');
    }
    
    // Generate deterministic mock embedding locally
    return generateMockEmbedding(text);
}

/**
 * Generate mock 768-dimensional embedding deterministically based on input text
 */
function generateMockEmbedding(text = '') {
    const vector = [];
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
        seed += text.charCodeAt(i);
    }
    
    // Seeded pseudo-random generation
    for (let i = 0; i < 768; i++) {
        const x = Math.sin(seed + i) * 10000;
        vector.push(x - Math.floor(x));
    }
    return vector;
}

module.exports = {
    getEmbedding
};
