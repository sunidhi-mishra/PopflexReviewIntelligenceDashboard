const { ingestReviews } = require('../services/ingestionService');
const { analyzeNewReviews, computeMonthlyAnalytics } = require('../services/analysisService');
const { exportMonthlyAnalytics } = require('../services/exportService');
const { sendMonthlyEmailReport } = require('../services/emailService');
const db = require('../db/db');

async function executeSyncPipeline() {
    const args = process.argv.slice(2);
    let targetMonth = null;

    console.log('[SyncPipeline] Starting execution...');

    if (args.includes('--all')) {
        targetMonth = null;
        console.log('[SyncPipeline] Target Month: ALL (full historical sync)');
    } else if (args.includes('--month')) {
        const index = args.indexOf('--month');
        if (index !== -1 && args[index + 1]) {
            targetMonth = args[index + 1];
            console.log(`[SyncPipeline] Target Month: ${targetMonth}`);
        }
    } else {
        // By default, target the prior month
        const now = new Date();
        const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        targetMonth = priorDate.toISOString().substring(0, 7); // Format: YYYY-MM
        console.log(`[SyncPipeline] Target Month: ${targetMonth} (default prior month)`);
    }

    try {
        // Step 1: Ingest reviews from Shopify Judge.me
        const ingestResult = await ingestReviews(targetMonth);
        console.log('[SyncPipeline] Ingestion phase finished:', ingestResult);

        if (ingestResult.success) {
            // Step 2: Run Groq NLP analysis on all uncategorized reviews
            const analysisResult = await analyzeNewReviews();
            console.log('[SyncPipeline] AI Analysis phase finished:', analysisResult);

            // Determine the cohort month to run analytics against
            let monthToAnalyze = targetMonth;
            if (!monthToAnalyze) {
                // If syncing all or no month specified, default to the current calendar month
                const now = new Date();
                monthToAnalyze = now.toISOString().substring(0, 7);
            }

            // Step 3: Compute monthly metrics & health scores
            console.log(`[SyncPipeline] Starting monthly metrics calculation for ${monthToAnalyze}...`);
            const metricsResult = await computeMonthlyAnalytics(monthToAnalyze);
            console.log('[SyncPipeline] Monthly metrics calculation finished:', metricsResult);

            if (metricsResult.success && metricsResult.count > 0) {
                // Step 4: Export report to Google Docs via Vercel MCP server
                console.log(`[SyncPipeline] Starting Google Docs export for ${monthToAnalyze}...`);
                const exportResult = await exportMonthlyAnalytics(monthToAnalyze);
                console.log('[SyncPipeline] Google Docs export finished:', exportResult);

                // Step 5: Send digest email via Vercel MCP server
                console.log(`[SyncPipeline] Starting monthly email overview report dispatch for ${monthToAnalyze}...`);
                const emailResult = await sendMonthlyEmailReport(monthToAnalyze);
                console.log('[SyncPipeline] Monthly email report dispatch finished:', emailResult);
            } else {
                console.warn('[SyncPipeline] No metrics computed or count is 0. Skipping Google Docs export and email reports.');
            }
        } else {
            console.error('[SyncPipeline] Ingestion failed. Skipping AI Analysis and downstream phases.');
        }

        console.log('[SyncPipeline] Sync pipeline execution completed successfully.');
    } catch (error) {
        console.error('[SyncPipeline] Pipeline execution crashed:', error);
    } finally {
        await db.close();
        console.log('[SyncPipeline] Database connection closed.');
    }
}

executeSyncPipeline();
