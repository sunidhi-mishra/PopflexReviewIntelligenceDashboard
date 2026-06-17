const { getEmbedding } = require('../services/embeddingService');

async function main() {
    console.log('Testing POPFLEX Embedding Service...');
    try {
        const text = 'I love these leggings! The fit is perfect.';
        console.log(`Generating embedding for text: "${text}"`);
        
        const embedding = await getEmbedding(text);
        
        console.log('✔ Embedding generated successfully.');
        console.log(`Embedding Dimensions: ${embedding.length}`);
        console.log(`First 5 dimensions: [ ${embedding.slice(0, 5).join(', ')} ]`);
    } catch (e) {
        console.error('Test failed with error:', e);
    }
}

main();
