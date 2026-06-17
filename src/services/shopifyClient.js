const https = require('https');

// Helper to make GET requests to the Judge.me public storefront API
function getJson(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        https.get(url, options, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch reviews: Status ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Helper to strip HTML tags from review bodies
function stripHtml(html = '') {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>/gi, '\n') // Convert line breaks
        .replace(/<[^>]*>/g, '')      // Strip remaining HTML tags
        .replace(/&nbsp;/g, ' ')      // Clean up spaces
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

// Inferred category mapper based on product title
function inferCategory(title = '') {
    const cleanTitle = title.toLowerCase();
    if (cleanTitle.includes('pant') || cleanTitle.includes('legging') || cleanTitle.includes('tights')) {
        return 'Pants & Leggings';
    } else if (cleanTitle.includes('sweatshirt') || cleanTitle.includes('hoodie') || cleanTitle.includes('sweater') || cleanTitle.includes('top')) {
        return 'Sweatshirts & Tops';
    } else if (cleanTitle.includes('dress')) {
        return 'Dresses';
    } else if (cleanTitle.includes('skort') || cleanTitle.includes('skirt')) {
        return 'Skorts & Skirts';
    } else if (cleanTitle.includes('bag') || cleanTitle.includes('backpack')) {
        return 'Bags & Accessories';
    } else {
        return 'Activewear';
    }
}

class ShopifyClient {
    constructor() {
        this.shopDomain = 'popflex.myshopify.com';
        // Seed of known product IDs parsed from POPFLEX storefront
        this.seedProductIds = [
            '7064461017171', // Pirouette Skort - Digital Lavender
            '7728978591827', // Zip Leggings / Cargo
            '6987802116179', // Sweatshirt / Oversized Hoodie
            '7729432494163', // Active Dress
            '7317319974995', // Twirl Skort
            '7778136326227'  // Mockneck Sweatshirt
        ];
    }

    /**
     * Ingest review data from Judge.me public CDN/Widget endpoints for POPFLEX products
     */
    async fetchReviews(syncMonth = null) {
        console.log(`[ShopifyClient] Fetching live reviews from POPFLEX Storefront. Target Month: ${syncMonth || 'ALL'}...`);
        const allFetchedReviews = [];

        for (const productId of this.seedProductIds) {
            try {
                // Fetch first 2 pages of reviews per seed product
                for (let page = 1; page <= 2; page++) {
                    const url = `https://judge.me/reviews/reviews_for_widget?shop_domain=${this.shopDomain}&platform=shopify&product_id=${productId}&page=${page}`;
                    const res = await getJson(url);
                    
                    if (res && res.reviews && res.reviews.length > 0) {
                        res.reviews.forEach(review => {
                            const body = stripHtml(review.body_html || '');
                            const title = review.product_title || 'POPFLEX Product';
                            const category = inferCategory(title);
                            
                            const standardizedReview = {
                                review_id: review.uuid,
                                product: {
                                    product_id: `prod_${productId}`,
                                    sku: `SKU-${productId}`,
                                    name: title,
                                    category: category
                                },
                                rating: review.rating,
                                title: review.title || 'Verified Review',
                                body: body,
                                created_at: review.created_at, // ISO String returned by Judge.me
                                verified: review.verified_buyer === 'verified' || !!review.verified_buyer,
                                source: 'popflexactive.com'
                            };

                            allFetchedReviews.push(standardizedReview);
                        });
                    }
                }
            } catch (err) {
                console.error(`[ShopifyClient] Failed to fetch reviews for product ${productId}:`, err.message);
            }
        }

        // Apply monthly sync filter if specified
        if (syncMonth) {
            return allFetchedReviews.filter(rev => {
                const revMonth = rev.created_at.substring(0, 7); // Format: YYYY-MM
                return revMonth === syncMonth;
            });
        }

        return allFetchedReviews;
    }
}

module.exports = new ShopifyClient();
