const https = require('https');

const MCP_ENDPOINT_URL = 'https://google-mcp-manual.vercel.app/api/mcp';

/**
 * Call a tool on the Vercel MCP Server
 * @param {string} name - Name of the tool to call
 * @param {object} args - Arguments to pass to the tool
 * @returns {Promise<object>} - Result of the tool execution
 */
async function callTool(name, args = {}) {
    const payload = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: name,
            arguments: args
        },
        id: Date.now()
    });

    const parsedUrl = new URL(MCP_ENDPOINT_URL);
    const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Accept': 'application/json, text/event-stream'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    // Since Vercel MCP server uses Server-Sent Events (SSE),
                    // the output format is: "event: message\ndata: { ... }"
                    const match = body.match(/data:\s*({[\s\S]*})/);
                    if (match) {
                        const parsedData = JSON.parse(match[1]);
                        
                        if (parsedData.error) {
                            reject(new Error(`MCP Tool Error: ${parsedData.error.message}`));
                        } else if (parsedData.result) {
                            resolve(parsedData.result);
                        } else {
                            resolve(parsedData);
                        }
                    } else {
                        // Fallback in case it's returned as standard JSON
                        const parsedData = JSON.parse(body);
                        if (parsedData.error) {
                            reject(new Error(`MCP Tool Error: ${parsedData.error.message}`));
                        } else {
                            resolve(parsedData.result || parsedData);
                        }
                    }
                } catch (err) {
                    reject(new Error(`Failed to parse MCP response: ${err.message}. Raw: ${body}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Connection to MCP server failed: ${err.message}`));
        });

        req.write(payload);
        req.end();
    });
}

module.exports = {
    callTool
};
