const { ingestReviews } = require('../services/ingestionService');
const { analyzeNewReviews } = require('../services/analysisService');
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
        // Step 1: Ingest reviews
        const ingestResult = await ingestReviews(targetMonth);
        console.log('[SyncPipeline] Ingestion phase finished:', ingestResult);

        if (ingestResult.success) {
            // Step 2: Run Groq NLP analysis on all uncategorized reviews
            const analysisResult = await analyzeNewReviews();
            console.log('[SyncPipeline] AI Analysis phase finished:', analysisResult);
        } else {
            console.error('[SyncPipeline] Ingestion failed. Skipping AI Analysis phase.');
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
