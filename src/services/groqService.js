require('dotenv').config();
const { Groq } = require('groq-sdk');

// Ensure Groq client is initialized with API key
let groqInstance = null;
try {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
        groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
} catch (e) {
    console.warn('[GroqService] Warning: Could not initialize Groq SDK:', e.message);
}

/**
 * Perform AI sentiment analysis and theme classification using Groq Llama 3 LLM
 */
async function analyzeReview(reviewText, rating) {
    if (!groqInstance) {
        // Fallback mock classification for local testing/development if key is not configured
        console.warn('[GroqService] Groq API Key is not configured. Falling back to rule-based classification.');
        return mockAnalyzeReview(reviewText, rating);
    }

    const prompt = `
You are an expert customer feedback analyzer for POPFLEX, a creator-led activewear brand.
Analyze the following customer review and its rating, then classify its sentiment and identify key themes.

Review Text: "${reviewText}"
Rating: ${rating} out of 5 stars

Classify the review. You must identify themes from this list only:
- "Sizing & Fit" (sizing complaints, fit issues, length adjustments, body shape compatibility)
- "Fabric Quality" (material thickness, see-through issues, fabric pilling, sweat stains)
- "Durability" (seam ripping, broken zippers, drawstring defects, losing shape after washing)
- "Comfort" (softness, digging in, skin irritation, support levels)
- "Design & Utility" (functional pockets, lack of front seam, styling features, aesthetics)
- "Shipping & Logistics" (delivery delays, missing packages, tracking issues, international customs fees)

Return ONLY a JSON object with this exact structure:
{
  "sentiment": "Positive" | "Neutral" | "Negative",
  "sentiment_score": float, // A score from -1.0 (highly negative) to 1.0 (highly positive)
  "themes": ["Theme1", "Theme2"] // Array of themes identified from the allowed list (can be empty)
}
`;

    try {
        const chatCompletion = await groqInstance.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise data analysis agent that outputs data strictly in JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            temperature: 0.1
        });

        const rawResponse = chatCompletion.choices[0].message.content;
        const result = JSON.parse(rawResponse);
        
        // Sanity validation of output fields
        return {
            sentiment: result.sentiment || (rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative'),
            sentiment_score: typeof result.sentiment_score === 'number' ? result.sentiment_score : (rating - 3) / 2,
            themes: Array.isArray(result.themes) ? result.themes : []
        };
    } catch (error) {
        console.error('[GroqService] Error during Groq API call:', error.message);
        // Fallback to rule-based analysis on failure
        return mockAnalyzeReview(reviewText, rating);
    }
}

// Rule-based fallback classifier if GROQ_API_KEY is not set or API fails
function mockAnalyzeReview(text = '', rating) {
    const cleanText = text.toLowerCase();
    const themes = [];
    
    // Theme mapping rules
    if (cleanText.includes('size') || cleanText.includes('fit') || cleanText.includes('tight') || cleanText.includes('short') || cleanText.includes('long')) {
        themes.push('Sizing & Fit');
    }
    if (cleanText.includes('material') || cleanText.includes('fabric') || cleanText.includes('see-through') || cleanText.includes('quality') || cleanText.includes('thin')) {
        themes.push('Fabric Quality');
    }
    if (cleanText.includes('rip') || cleanText.includes('tear') || cleanText.includes('wash') || cleanText.includes('broke') || cleanText.includes('seam')) {
        themes.push('Durability');
    }
    if (cleanText.includes('comfort') || cleanText.includes('soft') || cleanText.includes('digs') || cleanText.includes('irritate')) {
        themes.push('Comfort');
    }
    if (cleanText.includes('pocket') || cleanText.includes('design') || cleanText.includes('love') || cleanText.includes('cute')) {
        themes.push('Design & Utility');
    }
    if (cleanText.includes('ship') || cleanText.includes('delivery') || cleanText.includes('order') || cleanText.includes('track')) {
        themes.push('Shipping & Logistics');
    }

    let sentiment = 'Neutral';
    let sentiment_score = 0.0;

    if (rating >= 4) {
        sentiment = 'Positive';
        sentiment_score = rating === 5 ? 0.9 : 0.6;
    } else if (rating <= 2) {
        sentiment = 'Negative';
        sentiment_score = rating === 1 ? -0.9 : -0.5;
    }

    return { sentiment, sentiment_score, themes };
}

module.exports = {
    analyzeReview
};
