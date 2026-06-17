const db = require('../db/db');
const mcpClient = require('./mcpClient');

/**
 * Format monthly analytics into a structured Markdown document and export to Google Docs
 * @param {string} month - Target month (format: YYYY-MM)
 */
async function exportMonthlyAnalytics(month) {
    if (!month) {
        throw new Error('[ExportService] Month is required (format: YYYY-MM)');
    }
    console.log(`[ExportService] Compiling Google Docs export for ${month}...`);

    try {
        // 1. Fetch monthly analytics details
        const analytics = await db.all(
            `SELECT p.name, p.sku, p.category, a.review_count, a.avg_rating, a.health_score, a.primary_issue
             FROM monthly_analytics a
             JOIN products p ON a.product_id = p.product_id
             WHERE a.month = ?
             ORDER BY a.health_score DESC`,
            [month]
        );

        if (analytics.length === 0) {
            console.warn(`[ExportService] No monthly analytics records found in database for ${month}. Export aborted.`);
            return { success: false, reason: 'No data found' };
        }

        // 2. Fetch theme distribution for this month
        const themeStats = await db.all(
            `SELECT t.theme_name, COUNT(*) as count, AVG(r.rating) as avg_rating
             FROM reviews r
             JOIN review_themes t ON r.review_id = t.review_id
             WHERE r.sync_month = ?
             GROUP BY t.theme_name
             ORDER BY count DESC`,
            [month]
        );

        // 3. Fetch general stats
        const overallStats = await db.get(
            `SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating
             FROM reviews
             WHERE sync_month = ?`,
            [month]
        );

        // 4. Construct Markdown Content
        const title = `POPFLEX Product Health & AI Review Report - ${month}`;
        let docContent = `# ${title}\n\n`;
        
        docContent += `Generated: ${new Date().toLocaleDateString()}\n`;
        docContent += `Cohort Month: ${month}\n`;
        docContent += `Total Reviews Ingested: ${overallStats.total_reviews}\n`;
        docContent += `Average Catalog Rating: ${overallStats.avg_rating ? overallStats.avg_rating.toFixed(2) : 'N/A'} stars\n\n`;
        
        docContent += `## 1. Executive Summary\n`;
        const lowHealthProducts = analytics.filter(a => a.health_score < 3.5);
        if (lowHealthProducts.length > 0) {
            docContent += `WARNING: There are ${lowHealthProducts.length} product(s) showing deteriorated health scores (< 3.5) this month. Immediate sourcing or design review recommended.\n\n`;
        } else {
            docContent += `All catalog products are performing in the optimal health score range (>= 3.5). Sizing and fabric quality are stable.\n\n`;
        }

        docContent += `## 2. Product Health Leaderboard\n`;
        docContent += `Below is the list of products ranked by their composite Product Health Index (PHI). PHI combines customer star ratings, NLP sentiment polarity, and sizing/fabric/durability penalty deductions.\n\n`;
        docContent += `| Product Name | SKU | Category | Reviews | Avg Rating | Health Score | Primary Issue |\n`;
        docContent += `| :--- | :--- | :--- | :---: | :---: | :---: | :--- |\n`;
        
        analytics.forEach(item => {
            docContent += `| ${item.name} | ${item.sku} | ${item.category} | ${item.review_count} | ${item.avg_rating.toFixed(1)} | ${item.health_score.toFixed(2)} / 5.0 | ${item.primary_issue} |\n`;
        });
        docContent += `\n`;

        docContent += `## 3. NLP Theme Distribution & Quality Drivers\n`;
        docContent += `Distribution of identified product themes across all customer reviews for ${month}:\n\n`;
        docContent += `| Theme Category | Volume | Avg Rating | Quality Status |\n`;
        docContent += `| :--- | :---: | :---: | :--- |\n`;
        
        themeStats.forEach(theme => {
            let status = 'Optimal';
            if (theme.avg_rating < 3.0) status = 'Critical Action Required';
            else if (theme.avg_rating < 4.0) status = 'Needs Monitoring';
            
            docContent += `| ${theme.theme_name} | ${theme.count} | ${theme.avg_rating.toFixed(1)} | ${status} |\n`;
        });
        docContent += `\n`;

        docContent += `## 4. Product Lifecycle Warnings\n`;
        const criticalIssues = analytics.filter(a => a.health_score < 3.0 || a.primary_issue === 'Durability' || a.primary_issue === 'Sizing & Fit');
        if (criticalIssues.length > 0) {
            criticalIssues.forEach(item => {
                docContent += `- **${item.name} (SKU: ${item.sku}):** Flagged for **${item.primary_issue}** issues. Composite health index dropped to **${item.health_score.toFixed(2)}**. Recommend pattern inspection and sizing chart updates.\n`;
            });
        } else {
            docContent += `No critical product lifecycle warnings triggered this month.\n`;
        }

        // 5. Trigger Vercel MCP Tool Call
        console.log(`[ExportService] Sending document creation request to MCP server...`);
        const result = await mcpClient.callTool('create_document', {
            title: title,
            content: docContent
        });

        console.log(`[ExportService] Google Doc created successfully. Response:`, result);

        // Extract document ID from result text (Format: "Successfully created document! ID: <docId>")
        let docId = '';
        const rawText = result.content && result.content[0] ? result.content[0].text : '';
        const match = rawText.match(/ID:\s*([a-zA-Z0-9-_]+)/);
        if (match) {
            docId = match[1];
            // 6. Update dashboard settings with the latest document ID
            await db.run(
                `UPDATE dashboard_settings 
                 SET doc_export_id = ? 
                 WHERE setting_id = 1`,
                [docId]
            );
            console.log(`[ExportService] Saved exported Google Doc ID (${docId}) to dashboard settings database.`);
        }

        return { success: true, docId, docText: rawText };
    } catch (error) {
        console.error('[ExportService] Error exporting analytics to Google Docs:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    exportMonthlyAnalytics
};
