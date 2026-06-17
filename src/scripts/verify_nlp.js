const groqService = require('../services/groqService');

async function testNlpClassifier() {
    console.log('=== Testing POPFLEX AI Sentiment & Theme Classifier ===\n');
    
    const testCases = [
        {
            text: "The leggings fit like a glove, but the zipper on the pocket broke on my first workout! So disappointed in the durability.",
            rating: 2
        },
        {
            text: "This dress is incredibly soft and comfortable. I wear it everywhere and the pocket fits my phone perfectly!",
            rating: 5
        },
        {
            text: "Shipping took almost 3 weeks and the tracking was completely broken. The skort itself runs a bit small around the waist.",
            rating: 3
        }
    ];

    console.log(`Checking API Key configuration...`);
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
        console.log('✔ GROQ_API_KEY env variable is loaded.');
    } else {
        console.log('⚠ GROQ_API_KEY is not loaded. Script will run in rule-based mock fallback mode.');
    }
    console.log('');

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(`--- Test Case ${i + 1} ---`);
        console.log(`Input Text: "${tc.text}"`);
        console.log(`Rating: ${tc.rating} Stars`);
        
        try {
            const result = await groqService.analyzeReview(tc.text, tc.rating);
            console.log(`Classification Result:`);
            console.log(JSON.stringify(result, null, 2));
        } catch (e) {
            console.error(`Error during classification:`, e.message);
        }
        console.log('');
    }
}

testNlpClassifier();
