const db = require('../db/db');
const groqService = require('./groqService');

/**
 * Fetch and process all reviews that have not yet been categorized by the NLP engine
 */
async function analyzeNewReviews() {
    console.log('[AnalysisService] Checking for un-analyzed reviews in database...');
    
    try {
        // Find reviews where sentiment is null
        const unanalyzedReviews = await db.all(
            `SELECT review_id, rating, body 
             FROM reviews 
             WHERE sentiment IS NULL`
        );
        
        console.log(`[AnalysisService] Found ${unanalyzedReviews.length} un-analyzed reviews.`);
        
        let processedCount = 0;
        
        for (const review of unanalyzedReviews) {
            // Trim review body or use title if body is too short
            const textToAnalyze = review.body ? review.body.trim() : 'Verified Review';
            
            console.log(`[AnalysisService] Analyzing review ${review.review_id} (Rating: ${review.rating})...`);
            
            // Call Groq classification service
            const analysis = await groqService.analyzeReview(textToAnalyze, review.rating);
            
            // 1. Update review record with sentiment
            await db.run(
                `UPDATE reviews 
                 SET sentiment = ?, sentiment_score = ? 
                 WHERE review_id = ?`,
                [analysis.sentiment, analysis.sentiment_score, review.review_id]
            );
            
            // 2. Insert mapped themes
            if (analysis.themes && analysis.themes.length > 0) {
                for (const theme of analysis.themes) {
                    await db.run(
                        `INSERT OR IGNORE INTO review_themes (review_id, theme_name) 
                         VALUES (?, ?)`,
                        [review.review_id, theme]
                    );
                }
            }
            
            processedCount++;
            
            // Throttle slightly to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`[AnalysisService] Successfully processed ${processedCount} reviews.`);
        return { success: true, processedCount };
    } catch (error) {
        console.error('[AnalysisService] Error during database reviews analysis:', error);
        return { success: false, error: error.message };
    }
}

// Command-line execution support
async function runCLI() {
    console.log('[CLI] Connecting to database for review analysis run...');
    const result = await analyzeNewReviews();
    console.log('[CLI] Analysis Execution Result:', result);
    await db.close();
    console.log('[CLI] Database connection closed.');
}

if (require.main === module) {
    runCLI();
}

module.exports = {
    analyzeNewReviews
};
