const db = require('../db/db');

async function runDiagnostics() {
    console.log('=== Running POPFLEX Database Diagnostic Audit ===\n');
    
    try {
        // 1. Verify Products
        const productCount = await db.get('SELECT COUNT(*) as count FROM products');
        console.log(`Total Products in Database: ${productCount.count}`);
        
        const products = await db.all('SELECT * FROM products');
        console.log('Product Catalog List:');
        console.table(products);
        console.log('');

        // 2. Verify Reviews
        const reviewCount = await db.get('SELECT COUNT(*) as count FROM reviews');
        console.log(`Total Reviews in Database: ${reviewCount.count}`);
        
        const avgRating = await db.get('SELECT AVG(rating) as avg_rating FROM reviews');
        console.log(`Average Review Rating: ${avgRating.avg_rating ? avgRating.avg_rating.toFixed(2) : 'N/A'} stars`);
        
        // Distribution of ratings
        const ratingDist = await db.all(`
            SELECT rating, COUNT(*) as count 
            FROM reviews 
            GROUP BY rating 
            ORDER BY rating DESC
        `);
        console.log('\nReview Rating Distribution:');
        console.table(ratingDist);

        // Reviews grouped by product
        const reviewsByProduct = await db.all(`
            SELECT p.name, p.sku, COUNT(r.review_id) as review_count, AVG(r.rating) as avg_rating
            FROM products p
            LEFT JOIN reviews r ON p.product_id = r.product_id
            GROUP BY p.product_id
        `);
        console.log('\nReviews Summary by Product:');
        console.table(reviewsByProduct);

        // Monthly cohort distribution
        const reviewsByMonth = await db.all(`
            SELECT sync_month, COUNT(*) as count 
            FROM reviews 
            GROUP BY sync_month 
            ORDER BY sync_month ASC
        `);
        console.log('\nReviews Ingested by Month Cohort:');
        console.table(reviewsByMonth);

        // Settings Check
        const settings = await db.get('SELECT * FROM dashboard_settings LIMIT 1');
        console.log('\nDashboard Settings Configured:');
        console.table([settings]);

        // Sample Review Ingestion Check
        const samples = await db.all(`
            SELECT r.review_id, p.name as product_name, r.rating, SUBSTR(r.body, 1, 60) || '...' as body_snippet, r.sync_month
            FROM reviews r
            JOIN products p ON r.product_id = p.product_id
            LIMIT 3
        `);
        console.log('\nSample Review Records:');
        console.table(samples);

        console.log('\nAudit status: SUCCESS. SQLite database is operational and holds valid tables & indices.');
    } catch (error) {
        console.error('Audit status: FAILURE. Database error encountered:', error);
    } finally {
        await db.close();
        console.log('\nDatabase connection closed.');
    }
}

runDiagnostics();
