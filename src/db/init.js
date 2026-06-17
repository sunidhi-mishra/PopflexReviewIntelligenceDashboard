const db = require('./db');

async function initializeDatabase() {
    console.log('Initializing POPFLEX Review Intelligence Database...');
    try {
        // 1. Create Products table
        await db.run(`
            CREATE TABLE IF NOT EXISTS products (
                product_id TEXT PRIMARY KEY,
                sku TEXT UNIQUE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('- Products table initialized.');

        // 2. Create Reviews table
        await db.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                review_id TEXT PRIMARY KEY,
                product_id TEXT,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                body TEXT NOT NULL,
                created_at DATETIME,
                verified BOOLEAN DEFAULT 0,
                sentiment TEXT CHECK(sentiment IN ('Positive', 'Neutral', 'Negative')),
                sentiment_score REAL,
                sync_month TEXT,
                FOREIGN KEY(product_id) REFERENCES products(product_id)
            )
        `);
        console.log('- Reviews table initialized.');

        // 3. Create Review Themes table
        await db.run(`
            CREATE TABLE IF NOT EXISTS review_themes (
                theme_id INTEGER PRIMARY KEY AUTOINCREMENT,
                review_id TEXT,
                theme_name TEXT NOT NULL,
                FOREIGN KEY(review_id) REFERENCES reviews(review_id),
                UNIQUE(review_id, theme_name)
            )
        `);
        console.log('- Review Themes table initialized.');

        // 3a. Create Review Embeddings table
        await db.run(`
            CREATE TABLE IF NOT EXISTS review_embeddings (
                review_id TEXT PRIMARY KEY,
                embedding TEXT NOT NULL,
                FOREIGN KEY(review_id) REFERENCES reviews(review_id)
            )
        `);
        console.log('- Review Embeddings table initialized.');

        // 4. Create Monthly Analytics table
        await db.run(`
            CREATE TABLE IF NOT EXISTS monthly_analytics (
                analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT,
                month TEXT, -- YYYY-MM
                review_count INTEGER DEFAULT 0,
                avg_rating REAL DEFAULT 0.0,
                health_score REAL DEFAULT 0.0,
                primary_issue TEXT,
                FOREIGN KEY(product_id) REFERENCES products(product_id),
                UNIQUE(product_id, month)
            )
        `);
        console.log('- Monthly Analytics table initialized.');

        // 5. Create Dashboard Settings table
        await db.run(`
            CREATE TABLE IF NOT EXISTS dashboard_settings (
                setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_email TEXT DEFAULT '',
                doc_export_id TEXT DEFAULT ''
            )
        `);
        console.log('- Dashboard Settings table initialized.');

        // Insert a default dashboard settings row if not exists
        const settingsExists = await db.get('SELECT COUNT(*) as count FROM dashboard_settings');
        if (settingsExists.count === 0) {
            await db.run(`
                INSERT INTO dashboard_settings (target_email, doc_export_id)
                VALUES ('operations@popflexactive.com', '')
            `);
            console.log('- Default dashboard settings row inserted.');
        }

        console.log('Database initialization completed successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        await db.close();
    }
}

// Support executing directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
