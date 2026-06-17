const db = require('../db/db');
const mcpClient = require('./mcpClient');

/**
 * Compile monthly statistics and send a beautiful HTML overview report via Vercel MCP Gmail integration
 * @param {string} month - Target month (format: YYYY-MM)
 */
async function sendMonthlyEmailReport(month) {
    if (!month) {
        throw new Error('[EmailService] Month is required (format: YYYY-MM)');
    }
    console.log(`[EmailService] Compiling monthly email overview report for ${month}...`);

    try {
        // 1. Fetch configured target email address from DB
        const settings = await db.get('SELECT target_email FROM dashboard_settings LIMIT 1');
        const recipientEmail = settings && settings.target_email ? settings.target_email : 'operations@popflexactive.com';

        // 2. Fetch monthly analytics details
        const analytics = await db.all(
            `SELECT p.name, p.sku, a.review_count, a.avg_rating, a.health_score, a.primary_issue
             FROM monthly_analytics a
             JOIN products p ON a.product_id = p.product_id
             WHERE a.month = ?
             ORDER BY a.health_score ASC`,
            [month]
        );

        if (analytics.length === 0) {
            console.warn(`[EmailService] No monthly analytics records found in database for ${month}. Email aborted.`);
            return { success: false, reason: 'No data found' };
        }

        // 3. Fetch general stats
        const overallStats = await db.get(
            `SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating
             FROM reviews
             WHERE sync_month = ?`,
            [month]
        );

        const reviewCount = overallStats.total_reviews || 0;
        const avgRating = overallStats.avg_rating || 0.0;

        // 4. Group alerts
        const criticalAlerts = analytics.filter(a => a.health_score < 3.0 || a.primary_issue === 'Durability');
        const warningAlerts = analytics.filter(a => a.health_score >= 3.0 && a.health_score < 4.0);

        // 5. Generate beautiful premium HTML email body
        const subject = `POPFLEX Monthly Review Intelligence Overview - ${month}`;
        
        let bodyHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2C3E50; margin: 0; padding: 0; background-color: #F8F9FA; }
        .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1A1A1A 0%, #333333 100%); padding: 30px; text-align: center; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 500; }
        .header p { margin: 5px 0 0 0; color: #EFA697; font-size: 14px; }
        .content { padding: 30px; }
        .stats-grid { display: table; width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 10px 0; }
        .stat-card { display: table-cell; width: 33%; background-color: #FAF4F2; border-radius: 6px; padding: 15px; text-align: center; border: 1px solid #F3E4E0; }
        .stat-value { font-size: 22px; font-weight: bold; color: #D47E6A; margin-bottom: 5px; }
        .stat-label { font-size: 11px; text-transform: uppercase; color: #7F8C8D; letter-spacing: 0.5px; }
        .section-title { font-size: 16px; font-weight: bold; color: #1A1A1A; border-bottom: 2px solid #FAF4F2; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px; }
        .alert-row { padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 14px; }
        .alert-critical { background-color: #FDEDEC; border-left: 4px solid #E74C3C; color: #922B21; }
        .alert-warning { background-color: #FEF9E7; border-left: 4px solid #F39C12; color: #7D6608; }
        .leaderboard-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        .leaderboard-table th { background-color: #FAF4F2; text-align: left; padding: 10px; font-weight: 600; border-bottom: 2px solid #F3E4E0; }
        .leaderboard-table td { padding: 10px; border-bottom: 1px solid #ECF0F1; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .badge-positive { background-color: #D4EFDF; color: #196F3D; }
        .badge-warning { background-color: #FADBD8; color: #7B241C; }
        .footer { background-color: #FAF4F2; padding: 20px; text-align: center; font-size: 12px; color: #95A5A6; border-top: 1px solid #F3E4E0; }
        .footer a { color: #D47E6A; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>POPFLEX Reviews Intelligence</h1>
            <p>Monthly Performance Digest &bull; ${month}</p>
        </div>
        
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${reviewCount}</div>
                    <div class="stat-label">Ingested</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgRating.toFixed(2)}</div>
                    <div class="stat-label">Avg Rating</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analytics.length}</div>
                    <div class="stat-label">Products Tracked</div>
                </div>
            </div>
            
            ${criticalAlerts.length > 0 ? `
            <div class="section-title">Critical Attention Required</div>
            ${criticalAlerts.map(item => `
                <div class="alert-row alert-critical">
                    <strong>${item.name} (Health: ${item.health_score.toFixed(2)})</strong><br/>
                    Primary issue: <em>${item.primary_issue}</em>. Sourcing inspection or pattern redesign is strongly advised.
                </div>
            `).join('')}
            ` : ''}
            
            ${warningAlerts.length > 0 ? `
            <div class="section-title font-bold">Needs Monitoring</div>
            ${warningAlerts.map(item => `
                <div class="alert-row alert-warning">
                    <strong>${item.name} (Health: ${item.health_score.toFixed(2)})</strong> - Sizing or Fabric comments show slight rating depression.
                </div>
            `).join('')}
            ` : ''}
            
            <div class="section-title">Catalog Health Ranking</div>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Avg Rating</th>
                        <th>Health Score</th>
                        <th>Primary Issue</th>
                    </tr>
                </thead>
                <tbody>
                    ${analytics.map(item => {
                        const scoreClass = item.health_score >= 4.0 ? 'badge-positive' : 'badge-warning';
                        return `
                        <tr>
                            <td><strong>${item.name}</strong><br/><span style="color:#7F8C8D;font-size:11px;">SKU: ${item.sku}</span></td>
                            <td>${item.avg_rating.toFixed(1)} ★</td>
                            <td><span class="badge ${scoreClass}">${item.health_score.toFixed(2)}</span></td>
                            <td><span style="color: ${item.primary_issue !== 'None' ? '#E74C3C' : '#27AE60'}">${item.primary_issue}</span></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <p style="font-size: 13px; line-height: 1.5; color: #7F8C8D; margin-top: 30px;">
                This overview has been automatically compiled following the POPFLEX monthly reviews sync pipeline execution. Detailed analytics dashboard has been updated.
            </p>
        </div>
        
        <div class="footer">
            Sent to dashboard configured address: <strong>${recipientEmail}</strong><br/>
            &copy; ${new Date().getFullYear()} POPFLEX Activewear. All rights reserved.<br/>
            Product Intelligence Engine powered by Groq & Vercel.
        </div>
    </div>
</body>
</html>
        `;

        // 6. Invoke MCP Tool Call
        console.log(`[EmailService] Invoking send_email tool for ${recipientEmail}...`);
        const result = await mcpClient.callTool('send_email', {
            recipient_email: recipientEmail,
            subject: subject,
            body_html: bodyHtml
        });

        console.log(`[EmailService] Email sent successfully via MCP. Response:`, result);
        return { success: true, resultText: result.content && result.content[0] ? result.content[0].text : '' };
    } catch (error) {
        console.error('[EmailService] Error sending monthly email report:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendMonthlyEmailReport
};
