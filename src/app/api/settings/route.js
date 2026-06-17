export const dynamic = 'force-dynamic';
const db = require('../../../db/db');

export async function GET() {
    try {
        const settings = await db.get('SELECT target_email, doc_export_id FROM dashboard_settings LIMIT 1');
        return Response.json(settings || { target_email: '', doc_export_id: '' });
    } catch (err) {
        console.error('API Error in /api/settings GET:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { target_email } = body;

        if (!target_email || typeof target_email !== 'string') {
            return Response.json({ error: 'Valid target_email is required' }, { status: 400 });
        }

        await db.run(
            `UPDATE dashboard_settings 
             SET target_email = ? 
             WHERE setting_id = 1`,
            [target_email]
        );

        return Response.json({ success: true, target_email });
    } catch (err) {
        console.error('API Error in /api/settings POST:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
