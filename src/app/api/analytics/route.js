export const dynamic = 'force-dynamic';
const db = require('../../../db/db');

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        let month = searchParams.get('month');

        if (!month) {
            // Default to the latest month that has data in monthly_analytics
            const latestMonthRow = await db.get(
                `SELECT DISTINCT month 
                 FROM monthly_analytics 
                 ORDER BY month DESC 
                 LIMIT 1`
            );
            
            if (latestMonthRow) {
                month = latestMonthRow.month;
            } else {
                const now = new Date();
                month = now.toISOString().substring(0, 7); // Fallback to current calendar month
            }
        }

        // 1. Fetch general statistics
        const generalStats = await db.get(
            `SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating
             FROM reviews
             WHERE sync_month = ?`,
            [month]
        );

        // 2. Fetch monthly product health indexes
        const productRankings = await db.all(
            `SELECT p.product_id, p.name, p.sku, p.category, a.review_count, a.avg_rating, a.health_score, a.primary_issue
             FROM monthly_analytics a
             JOIN products p ON a.product_id = p.product_id
             WHERE a.month = ?
             ORDER BY a.health_score DESC`,
            [month]
        );

        // 3. Fetch theme frequencies and rating impact
        const themeStats = await db.all(
            `SELECT t.theme_name, COUNT(*) as count, AVG(r.rating) as avg_rating
             FROM reviews r
             JOIN review_themes t ON r.review_id = t.review_id
             WHERE r.sync_month = ?
             GROUP BY t.theme_name
             ORDER BY count DESC`,
            [month]
        );

        // 4. Fetch list of recent sync months available
        const availableMonths = await db.all(
            `SELECT DISTINCT sync_month 
             FROM reviews 
             WHERE sync_month IS NOT NULL 
             ORDER BY sync_month DESC`
        );

        const responseData = {
            month,
            totalReviews: generalStats.total_reviews || 0,
            avgRating: generalStats.avg_rating || 0.0,
            products: productRankings,
            themes: themeStats,
            availableMonths: availableMonths.map(m => m.sync_month)
        };

        return Response.json(responseData);
    } catch (err) {
        console.error('API Error in /api/analytics:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
