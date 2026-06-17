/**
 * Validation Dataset for POPFLEX review classification.
 * Generates 200 unique, realistic, and deterministic reviews with ground-truth sentiment and theme annotations.
 * Uses a seedable pseudo-random generator to guarantee reproducibility.
 */

// Simple Seeded Pseudo-Random Number Generator (LCG)
function createRandom(seed) {
    let current = seed;
    return function() {
        current = (current * 9301 + 49297) % 233280;
        return current / 233280;
    };
}

const random = createRandom(42); // Fixed seed for absolute reproducibility

const PRODUCTS = [
    "leggings",
    "Serving Looks Dress",
    "Pirouette Skort",
    "Cloud Cargo Sweatpants",
    "Mockneck Sweatshirt",
    "Athena Backpack",
    "Zip Leggings",
    "Twirl Active Dress",
    "sports bra"
];

const INTROS = [
    "I bought these [product] last month and here is my honest opinion.",
    "So, I wanted to love this [product], but I have mixed feelings.",
    "Best purchase ever! These [product] are amazing.",
    "This [product] is not what I expected at all.",
    "Let's talk about this [product].",
    "I've been wearing the [product] for a few weeks now.",
    "Honestly, I'm really surprised by this [product].",
    "Just received my [product] and tried them on.",
    "I am a huge fan of POPFLEX but this [product] has some issues."
];

const THEME_TEMPLATES = {
    "Sizing & Fit": {
        positive: [
            "they fit true to size and hug my waist perfectly",
            "the fit is perfect and runs exactly as described in the sizing chart",
            "they fit like a glove and flatter my body shape",
            "perfect sizing and length for my height"
        ],
        negative: [
            "runs way too small, I could barely get them on",
            "had to size up two full sizes because they run so small",
            "the waistband is way too tight and rolls down",
            "they run a bit long and sag at the ankles"
        ]
    },
    "Fabric Quality": {
        positive: [
            "the fabric is nice and thick, completely squat proof",
            "the material is incredibly buttery soft and high-quality",
            "great material that does not feel cheap or see-through",
            "the fabric is breathable and doesn't show sweat stains"
        ],
        negative: [
            "the material is very thin and completely see-through",
            "fabric started pilling heavily after only one wash",
            "the fabric attracts lint like crazy and feels cheap",
            "shows sweat stains immediately during a light workout"
        ]
    },
    "Durability": {
        positive: [
            "holds up perfectly after multiple machine washes",
            "the seams are sturdy and well-reinforced",
            "zipper and pockets are durable and strong",
            "well-constructed and hasn't lost its shape at all"
        ],
        negative: [
            "the seams ripped during my very first squat session",
            "the pocket zipper broke after only two days",
            "the drawstring frayed and came out in the wash",
            "lost all elasticity and stretched out after washing"
        ]
    },
    "Comfort": {
        positive: [
            "incredibly comfortable for all-day wear",
            "super soft against my skin, no digging in",
            "does not cause skin irritation, feels weightless",
            "the support level is fantastic and comfortable"
        ],
        negative: [
            "the straps dig into my shoulders painfully",
            "the elastic band causes severe itching and irritation",
            "extremely uncomfortable, feels scratchy and stiff",
            "tight seams dig into my hips and make it hard to breathe"
        ]
    },
    "Design & Utility": {
        positive: [
            "the deep pockets fit my phone perfectly",
            "the design without a front seam is a complete game-changer",
            "love the flattering cross-waist design",
            "very cute styling and highly functional design"
        ],
        negative: [
            "really needs functional pockets, where do I put my keys?",
            "wish it didn't have the front seam as it causes cameltoe",
            "the pockets are way too shallow to hold anything",
            "the design looks cute but is completely impractical"
        ]
    },
    "Shipping & Logistics": {
        positive: [
            "shipping was super fast and arrived in cute packaging",
            "arrived ahead of schedule and package was in great shape",
            "delivery was quick and tracking was very accurate"
        ],
        negative: [
            "shipping took almost three weeks and tracking was broken",
            "package arrived damaged and customer support was slow to respond",
            "stuck in customs for two weeks and had to pay extra shipping fees"
        ]
    }
};

const TRANSITIONS = [
    " Also, ",
    " and ",
    " but ",
    ". However, ",
    ". On the other hand, ",
    " plus "
];

const OUTROS = [
    "Would definitely recommend!",
    "Save your money.",
    "I'll probably return it.",
    "Will buy in other colors!",
    "Not worth the price.",
    "Overall, a decent product."
];

function getRandomElement(arr) {
    const idx = Math.floor(random() * arr.length);
    return arr[idx];
}

function generateDataset() {
    const dataset = [];
    const themesList = Object.keys(THEME_TEMPLATES);

    for (let i = 0; i < 200; i++) {
        // Deterministically select product and intro
        const product = getRandomElement(PRODUCTS);
        let intro = getRandomElement(INTROS).replace("[product]", product);

        // Decide how many themes to include (1 to 3)
        const numThemes = Math.floor(random() * 3) + 1; // 1, 2, or 3
        
        // Shuffle themes list for selection
        const shuffledThemes = [...themesList].sort(() => random() - 0.5);
        const selectedThemes = shuffledThemes.slice(0, numThemes);

        // Decide the target polarity of the review
        // 0: negative, 1: mixed/neutral, 2: positive
        const polarityType = Math.floor(random() * 3); 
        
        const reviewThemes = [];
        const reviewTextParts = [];
        let positiveCount = 0;
        let negativeCount = 0;

        selectedThemes.forEach((theme, index) => {
            reviewThemes.push(theme);
            let isPositive = true;

            if (polarityType === 0) {
                isPositive = false;
            } else if (polarityType === 2) {
                isPositive = true;
            } else {
                // Mixed/neutral polarity: alternate or random
                isPositive = random() > 0.5;
            }

            if (isPositive) {
                positiveCount++;
                reviewTextParts.push(getRandomElement(THEME_TEMPLATES[theme].positive));
            } else {
                negativeCount++;
                reviewTextParts.push(getRandomElement(THEME_TEMPLATES[theme].negative));
            }
        });

        // Assemble review text
        let reviewBody = intro;
        reviewTextParts.forEach((part, index) => {
            if (index === 0) {
                reviewBody += " " + part.charAt(0).toUpperCase() + part.slice(1);
            } else {
                const trans = getRandomElement(TRANSITIONS);
                reviewBody += trans + part;
            }
        });
        
        // Add outro
        const outro = getRandomElement(OUTROS);
        reviewBody += ". " + outro;

        // Determine rating and sentiment
        let sentiment = "Neutral";
        let rating = 3;

        if (positiveCount > negativeCount) {
            sentiment = "Positive";
            rating = random() > 0.4 ? 5 : 4;
        } else if (negativeCount > positiveCount) {
            sentiment = "Negative";
            rating = random() > 0.4 ? 1 : 2;
        } else {
            sentiment = "Neutral";
            rating = 3;
        }

        dataset.push({
            id: `val_${i + 1}`,
            text: reviewBody,
            rating: rating,
            ground_truth: {
                sentiment: sentiment,
                themes: reviewThemes
            }
        });
    }

    return dataset;
}

module.exports = {
    generateDataset
};
