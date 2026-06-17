const { generateEmbeddingsForProcessedReviews, synthesizeRagResponse } = require('../services/ragService');
const db = require('../db/db');

async function main() {
    console.log('=== POPFLEX AI Review Intelligence: RAG Chatbot Test ===\n');

    try {
        // 1. Generate embeddings for database reviews
        console.log('--- Step 1: Generating review embeddings in database ---');
        const indexResult = await generateEmbeddingsForProcessedReviews();
        console.log('Index execution result:', indexResult);
        console.log('');

        // 2. Query Chatbot
        const query = 'Summarize what customers say about comfort and fit.';
        console.log(`--- Step 2: Querying Chatbot: "${query}" ---`);
        
        const result = await synthesizeRagResponse(query);
        
        console.log('\n--- Chatbot Answer: ---');
        console.log(result.answer);
        console.log('\n--- Sources Cited: ---');
        result.sources.forEach((s, i) => {
            console.log(`[Source ${i + 1}] Product: ${s.product_name} | Rating: ${s.rating}★ | Body: "${s.body.substring(0, 80)}..."`);
        });
        
    } catch (e) {
        console.error('Test crashed:', e);
    } finally {
        await db.close();
        console.log('\nDatabase connection closed.');
    }
}

main();
