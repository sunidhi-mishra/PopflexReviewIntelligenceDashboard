export const dynamic = 'force-dynamic';
const { synthesizeRagResponse } = require('../../../services/ragService');

export async function POST(request) {
    try {
        const body = await request.json();
        const { message } = body;
        
        if (!message || typeof message !== 'string') {
            return Response.json({ error: 'Message is required and must be a string' }, { status: 400 });
        }

        const result = await synthesizeRagResponse(message);
        return Response.json(result);
    } catch (err) {
        console.error('API Error in /api/chat:', err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
