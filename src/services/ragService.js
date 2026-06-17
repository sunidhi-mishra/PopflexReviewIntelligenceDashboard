const db = require('../db/db');
const { getEmbedding } = require('./embeddingService');
const { getGroqClient, callWithRetry } = require('./groqService');

/**
 * Generate and save embeddings for all reviews that don't have one in review_embeddings table
 */
async function generateEmbeddingsForProcessedReviews() {
    console.log('[RAGService] Checking for reviews missing embeddings...');
    try {
        const missingReviews = await db.all(
            `SELECT r.review_id, r.body 
             FROM reviews r
             LEFT JOIN review_embeddings e ON r.review_id = e.review_id
             WHERE e.review_id IS NULL`
        );

        console.log(`[RAGService] Found ${missingReviews.length} reviews missing embeddings.`);

        let count = 0;
        for (const review of missingReviews) {
            const textToEmbed = review.body ? review.body.trim() : 'Verified Review';
            const vector = await getEmbedding(textToEmbed);
            
            await db.run(
                `INSERT OR REPLACE INTO review_embeddings (review_id, embedding)
                 VALUES (?, ?)`,
                [review.review_id, JSON.stringify(vector)]
            );
            count++;
        }

        if (count > 0) {
            console.log(`[RAGService] Successfully generated and stored embeddings for ${count} reviews.`);
        }
        return { success: true, count };
    } catch (error) {
        console.error('[RAGService] Error generating review embeddings:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calculate cosine similarity between two float vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0.0;
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0.0;
}

/**
 * Semantically search the reviews database for top K matching records
 */
async function semanticSearchReviews(query, limit = 5) {
    if (!query) return [];
    console.log(`[RAGService] Performing semantic search for: "${query}"...`);

    try {
        // 1. Generate query embedding
        const queryVector = await getEmbedding(query);

        // 2. Fetch all review embeddings & matching reviews from SQLite
        const rows = await db.all(
            `SELECT r.review_id, r.rating, r.body, r.created_at, r.sync_month, p.name as product_name, p.sku, e.embedding
             FROM reviews r
             JOIN review_embeddings e ON r.review_id = e.review_id
             JOIN products p ON r.product_id = p.product_id`
        );

        // 3. Compute cosine similarity
        const matches = rows.map(row => {
            let embeddingArray;
            try {
                embeddingArray = JSON.parse(row.embedding);
            } catch (e) {
                embeddingArray = [];
            }
            
            const similarity = cosineSimilarity(queryVector, embeddingArray);
            return {
                review_id: row.review_id,
                rating: row.rating,
                body: row.body,
                created_at: row.created_at,
                sync_month: row.sync_month,
                product_name: row.product_name,
                sku: row.sku,
                similarity: similarity
            };
        });

        // 4. Sort and return top K
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches.slice(0, limit);
    } catch (err) {
        console.error('[RAGService] Error during semantic search:', err);
        return [];
    }
}

/**
 * Generate a conversational RAG answer using retrieved reviews context
 */
async function synthesizeRagResponse(userQuery) {
    if (!userQuery || typeof userQuery !== 'string') {
        throw new Error('[RAGService] Query must be a non-empty string.');
    }

    try {
        // Step A: Retrieve semantically relevant reviews
        const matchingReviews = await semanticSearchReviews(userQuery, 5);

        if (matchingReviews.length === 0) {
            return {
                answer: "I couldn't find any relevant reviews in the database to answer your question. Please run the monthly sync pipeline to ingest review data.",
                sources: []
            };
        }

        // Step B: Construct context content for prompt
        let contextText = '';
        matchingReviews.forEach((rev, idx) => {
            contextText += `--- Review Source ${idx + 1} ---\n`;
            contextText += `Product: ${rev.product_name} (SKU: ${rev.sku})\n`;
            contextText += `Rating: ${rev.rating} stars\n`;
            contextText += `Date: ${rev.created_at || rev.sync_month}\n`;
            contextText += `Feedback: "${rev.body}"\n\n`;
        });

        // Step C: Prompt Groq Llama model for synthesis
        const systemPrompt = `
You are POPFLEX's AI Review Intelligence Chatbot, designed to help operations and design teams analyze customer reviews.
Answer the user's question using the provided review context below.
Provide a clear, cohesive, and professional summary.
You MUST cite the source reviews in your answer by referring to their review source number (e.g. [Source 1], [Source 2]) whenever quoting or referencing comments from them.
Keep your response concise (under 250 words) and directly focused on the question.
`;

        const userPrompt = `
User Question: "${userQuery}"

Relevant Customer Reviews Context:
${contextText}
`;

        const chatCompletion = await callWithRetry(async () => {
            const client = getGroqClient();
            if (!client) {
                throw new Error('No Groq API client available');
            }
            return await client.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                model: 'llama-3.1-8b-instant',
                temperature: 0.3
            });
        });

        const answerText = chatCompletion.choices[0].message.content.trim();

        // Format sources without embedding key
        const sanitizedSources = matchingReviews.map(r => ({
            review_id: r.review_id,
            product_name: r.product_name,
            sku: r.sku,
            rating: r.rating,
            body: r.body,
            created_at: r.created_at || r.sync_month,
            similarity: r.similarity
        }));

        return {
            answer: answerText,
            sources: sanitizedSources
        };
    } catch (error) {
        console.error('[RAGService] Error during RAG synthesis:', error);
        return {
            answer: `Sorry, I encountered an error while synthesizing your response: ${error.message}`,
            sources: []
        };
    }
}

module.exports = {
    generateEmbeddingsForProcessedReviews,
    semanticSearchReviews,
    synthesizeRagResponse
};
