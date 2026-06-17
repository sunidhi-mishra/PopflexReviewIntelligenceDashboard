const https = require('https');

function listTools() {
    console.log('Sending JSON-RPC tools/list to https://google-mcp-manual.vercel.app/api/mcp ...');
    
    const payload = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
    });

    const options = {
        hostname: 'google-mcp-manual.vercel.app',
        path: '/api/mcp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            'Accept': 'application/json, text/event-stream'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:');
            try {
                const parsed = JSON.parse(body);
                console.log(JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log(body);
            }
        });
    });

    req.on('error', (err) => {
        console.error('Request error:', err);
    });

    req.write(payload);
    req.end();
}

listTools();
