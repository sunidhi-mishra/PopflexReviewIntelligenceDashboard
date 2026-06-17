export const dynamic = 'force-dynamic';
const { ingestReviews } = require('../../../services/ingestionService');
const { analyzeNewReviews, computeMonthlyAnalytics } = require('../../../services/analysisService');
const { exportMonthlyAnalytics } = require('../../../services/exportService');
const { sendMonthlyEmailReport } = require('../../../services/emailService');

export async function POST(request) {
    console.log('[API/Sync] Manual sync triggered from dashboard...');
    try {
        let targetMonth = null;
        try {
            const body = await request.json();
            if (body && body.month) {
                targetMonth = body.month;
            }
        } catch (e) {
            // body-less POST request
        }

        if (!targetMonth) {
            const now = new Date();
            targetMonth = now.toISOString().substring(0, 7); // Default to current month
        }

        console.log(`[API/Sync] Running sync pipeline for month: ${targetMonth}...`);

        // Step 1: Ingest
        const ingestResult = await ingestReviews(targetMonth);
        if (!ingestResult.success) {
            return Response.json({ success: false, phase: 'Ingestion', error: ingestResult.error }, { status: 500 });
        }

        // Step 2: AI Analysis (Groq NLP)
        const analysisResult = await analyzeNewReviews();
        if (!analysisResult.success) {
            return Response.json({ success: false, phase: 'AI Analysis', error: analysisResult.error }, { status: 500 });
        }

        // Step 3: Compute Monthly Metrics
        const metricsResult = await computeMonthlyAnalytics(targetMonth);
        if (!metricsResult.success) {
            return Response.json({ success: false, phase: 'Metrics Computation', error: metricsResult.error }, { status: 500 });
        }

        let exportResult = { success: false, reason: 'No reviews found' };
        let emailResult = { success: false, reason: 'No reviews found' };

        if (metricsResult.count > 0) {
            // Step 4: Export report to Google Docs via Vercel MCP server
            exportResult = await exportMonthlyAnalytics(targetMonth);
            
            // Step 5: Send Gmail overview email via Vercel MCP server
            emailResult = await sendMonthlyEmailReport(targetMonth);
        }

        return Response.json({
            success: true,
            month: targetMonth,
            ingest: ingestResult,
            analysis: analysisResult,
            metrics: metricsResult,
            export: exportResult,
            email: emailResult
        });
    } catch (err) {
        console.error('API Error in /api/sync:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
