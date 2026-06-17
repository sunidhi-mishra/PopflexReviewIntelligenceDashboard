const https = require('https');

function inspectMCP() {
    console.log('Connecting to MCP server at: https://google-mcp-manual.vercel.app/api/mcp ...');
    
    const req = https.get('https://google-mcp-manual.vercel.app/api/mcp', (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
            // For SSE, it might start streaming, so let's log the first chunk and close if it's SSE
            if (body.includes('event:')) {
                console.log('Received SSE stream chunk:');
                console.log(body);
                req.destroy(); // stop streaming
            }
        });
        
        res.on('end', () => {
            if (!body.includes('event:')) {
                console.log('Response body:');
                console.log(body);
            }
        });
    });

    req.on('error', (err) => {
        console.error('Request error:', err);
    });
}

inspectMCP();
