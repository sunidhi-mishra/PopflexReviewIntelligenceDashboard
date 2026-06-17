const { computeMonthlyAnalytics } = require('../services/analysisService');
const { exportMonthlyAnalytics } = require('../services/exportService');
const { sendMonthlyEmailReport } = require('../services/emailService');
const db = require('../db/db');

async function testPhase3() {
    console.log('====================================================');
    console.log('   POPFLEX AI Review Intelligence: MCP Integration  ');
    console.log('====================================================\n');

    // We will test using the '2026-06' cohort as it has 50 reviews in the SQLite DB
    const testMonth = '2026-06';

    try {
        // Step 1: Compute metrics
        console.log('--- Step 1: Computing Monthly Metrics & Health Scores ---');
        const metricsResult = await computeMonthlyAnalytics(testMonth);
        console.log('Metrics computation result:', metricsResult);
        console.log('');

        // Step 2: Export to Google Docs via Vercel MCP server
        console.log('--- Step 2: Exporting Report to Google Docs via Vercel MCP ---');
        const exportResult = await exportMonthlyAnalytics(testMonth);
        console.log('Google Docs export result:', exportResult);
        console.log('');

        // Step 3: Dispatch Gmail email digest via Vercel MCP
        console.log('--- Step 3: Dispatching HTML digest email via Vercel MCP ---');
        const emailResult = await sendMonthlyEmailReport(testMonth);
        console.log('Gmail dispatch result:', emailResult);
        console.log('');

        console.log('====================================================');
        console.log('      PHASE 3 INTEGRATION TEST COMPLETED            ');
        console.log('====================================================');
    } catch (error) {
        console.error('Integration test crashed:', error);
    } finally {
        await db.close();
        console.log('\nDatabase connection closed.');
    }
}

testPhase3();
