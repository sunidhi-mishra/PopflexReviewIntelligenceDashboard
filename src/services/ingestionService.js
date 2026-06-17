const db = require('../db/db');
const shopifyClient = require('./shopifyClient');

/**
 * Ingest reviews for a specific month (format: YYYY-MM) or all reviews if syncMonth is null
 */
async function ingestReviews(syncMonth = null) {
    console.log(`[IngestionService] Starting ingestion. Target Month: ${syncMonth || 'ALL'}...`);
    let connectionClosedHere = false;
    
    try {
        // Fetch reviews from Shopify client
        const reviews = await shopifyClient.fetchReviews(syncMonth);
        console.log(`[IngestionService] Retrieved ${reviews.length} reviews from Shopify.`);
        
        let productsInserted = 0;
        let reviewsInserted = 0;

        for (const rev of reviews) {
            const prod = rev.product;
            
            // 1. Ensure product exists in DB
            await db.run(
                `INSERT OR IGNORE INTO products (product_id, sku, name, category) 
                 VALUES (?, ?, ?, ?)`,
                [prod.product_id, prod.sku, prod.name, prod.category]
            );
            
            // 2. Insert or replace the review
            const revMonth = rev.created_at.substring(0, 7);
            const result = await db.run(
                `INSERT OR REPLACE INTO reviews (review_id, product_id, rating, body, created_at, verified, sync_month)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    rev.review_id,
                    prod.product_id,
                    rev.rating,
                    rev.body,
                    rev.created_at,
                    rev.verified ? 1 : 0,
                    revMonth
                ]
            );
            
            if (result.changes > 0) {
                reviewsInserted++;
            }
        }
        
        console.log(`[IngestionService] Ingestion completed. Ingested ${reviewsInserted} reviews across products.`);
        return { success: true, reviewsCount: reviewsInserted };
    } catch (error) {
        console.error('[IngestionService] Error during ingestion:', error);
        return { success: false, error: error.message };
    }
}

// Command-line invocation support
async function runCLI() {
    const args = process.argv.slice(2);
    let month = null;

    if (args.includes('--all')) {
        month = null;
    } else if (args.includes('--month')) {
        const index = args.indexOf('--month');
        if (index !== -1 && args[index + 1]) {
            month = args[index + 1];
        }
    } else {
        // By default, if database is empty, ingest all. Else ingest the current month.
        try {
            const countRow = await db.get('SELECT COUNT(*) as count FROM reviews');
            if (countRow.count === 0) {
                console.log('[IngestionService] Database empty. Defaulting to sync --all historical reviews.');
                month = null;
            } else {
                // Default to current date's month (YYYY-MM)
                const now = new Date();
                month = now.toISOString().substring(0, 7);
                console.log(`[IngestionService] Defaulting to sync for current month: ${month}`);
            }
        } catch (e) {
            console.error('[CLI] Error checking reviews count, default to sync --all.', e);
            month = null;
        }
    }

    const result = await ingestReviews(month);
    console.log(`[CLI] Ingestion Result:`, result);
    
    // Close connection after CLI execution
    await db.close();
    console.log('[CLI] Database connection closed.');
}

if (require.main === module) {
    runCLI();
}

module.exports = {
    ingestReviews
};
