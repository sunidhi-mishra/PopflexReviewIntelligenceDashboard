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

/**
 * Compute monthly metrics and health scores for a given month
 */
async function computeMonthlyAnalytics(month) {
    if (!month) {
        throw new Error('[AnalysisService] Month is required (format: YYYY-MM)');
    }
    console.log(`[AnalysisService] Computing monthly metrics for ${month}...`);

    try {
        // Fetch distinct product IDs with reviews in the target month
        const products = await db.all(
            `SELECT DISTINCT product_id 
             FROM reviews 
             WHERE sync_month = ?`,
            [month]
        );

        console.log(`[AnalysisService] Found ${products.length} products with reviews in ${month}.`);

        for (const prod of products) {
            const productId = prod.product_id;

            // Compute review count, average rating, and average sentiment score
            const stats = await db.get(
                `SELECT COUNT(*) as count, AVG(rating) as avg_rating, AVG(sentiment_score) as avg_sentiment
                 FROM reviews
                 WHERE product_id = ? AND sync_month = ?`,
                [productId, month]
            );

            const reviewCount = stats.count || 0;
            const avgRating = stats.avg_rating || 0.0;
            const avgSentiment = stats.avg_sentiment !== null ? stats.avg_sentiment : 0.0;

            // Count negative reviews with return issues (Sizing & Fit, Fabric Quality, Durability)
            const returnIssues = await db.get(
                `SELECT COUNT(*) as count
                 FROM reviews r
                 JOIN review_themes t ON r.review_id = t.review_id
                 WHERE r.product_id = ? 
                   AND r.sync_month = ? 
                   AND r.sentiment = 'Negative' 
                   AND t.theme_name IN ('Sizing & Fit', 'Fabric Quality', 'Durability')`,
                [productId, month]
            );
            const penaltyCount = returnIssues.count || 0;

            // Find primary issue theme
            const primaryIssueRow = await db.get(
                `SELECT t.theme_name, COUNT(*) as count
                 FROM reviews r
                 JOIN review_themes t ON r.review_id = t.review_id
                 WHERE r.product_id = ? 
                   AND r.sync_month = ? 
                   AND r.sentiment = 'Negative'
                 GROUP BY t.theme_name
                 ORDER BY count DESC, t.theme_name ASC
                 LIMIT 1`,
                [productId, month]
            );
            const primaryIssue = primaryIssueRow ? primaryIssueRow.theme_name : 'None';

            // Health score: 60% average rating + 40% normalized sentiment score
            const normalizedSentiment = ((avgSentiment + 1) / 2) * 5; // Maps -1..1 to 0..5
            let healthScore = (avgRating * 0.6) + (normalizedSentiment * 0.4);

            // Deduct penalty (0.1 per return issue review, up to 1.0 max)
            const penalty = Math.min(1.0, penaltyCount * 0.1);
            healthScore = Math.max(0.0, healthScore - penalty);

            console.log(`[AnalysisService] Product ${productId}: Count=${reviewCount}, AvgRating=${avgRating.toFixed(2)}, AvgSentiment=${avgSentiment.toFixed(2)}, ReturnIssues=${penaltyCount}, HealthScore=${healthScore.toFixed(2)}, PrimaryIssue=${primaryIssue}`);

            // Insert or replace in database
            await db.run(
                `INSERT OR REPLACE INTO monthly_analytics 
                 (product_id, month, review_count, avg_rating, health_score, primary_issue)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [productId, month, reviewCount, avgRating, healthScore, primaryIssue]
            );
        }

        console.log(`[AnalysisService] Finished computing monthly metrics for ${month}.`);
        return { success: true, count: products.length };
    } catch (error) {
        console.error('[AnalysisService] Error computing monthly analytics:', error);
        return { success: false, error: error.message };
    }
}

// Command-line execution support
async function runCLI() {
    console.log('[CLI] Connecting to database for review analysis run...');
    const result = await analyzeNewReviews();
    console.log('[CLI] Analysis Execution Result:', result);
    
    // Default compute analytics for current month if CLI runs directly
    const now = new Date();
    const month = now.toISOString().substring(0, 7);
    const analyticsResult = await computeMonthlyAnalytics(month);
    console.log('[CLI] Monthly Analytics Result:', analyticsResult);

    await db.close();
    console.log('[CLI] Database connection closed.');
}

if (require.main === module) {
    runCLI();
}

module.exports = {
    analyzeNewReviews,
    computeMonthlyAnalytics
};
