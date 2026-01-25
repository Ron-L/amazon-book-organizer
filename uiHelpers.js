// uiHelpers.js - UI helper functions and constants
// Extracted from readerwrangler.js for reuse by Book Explorer
// v5.0.0-alpha.1

// ===== Storage Keys =====
const STORAGE_KEY = "readerwrangler-state";
const CACHE_KEY = "readerwrangler-enriched-cache";
const SETTINGS_KEY = "readerwrangler-settings";
const STATUS_KEY = "readerwrangler-status";
const FILTERS_KEY = "readerwrangler-filters";

// ===== Amazon =====
const AMAZON_AFFILIATE_TAG = 'rclewent-20';

// Build Amazon URL with affiliate tag (v4.4.0)
const getAmazonUrl = (asin) => `https://www.amazon.com/dp/${asin}?tag=${AMAZON_AFFILIATE_TAG}`;

// ===== Price Parsing =====
// Parse price string (e.g., "$5.99") to number, returns null if invalid
const parsePrice = (price) => {
    if (price == null) return null;
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        const cleaned = price.replace(/[$,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
    return null;
};

// ===== Book Normalization =====
// TODO: DEPRECATION 2026-07-20 - Remove legacy isOwned/isWishlist field handling after 6 months
// Legacy format: isOwned: true/false (from fetcher), isWishlist: 0/1 (internal derived)
// New format: onWishlist: true/false, ownershipType includes 'wishlist' for wishlist-only items
const normalizeBook = (book) => {
    const normalized = { ...book };

    // Handle legacy isOwned field from JSON files
    if ('isOwned' in book) {
        if (book.isOwned === false) {
            // Legacy wishlist item
            normalized.onWishlist = true;
            normalized.ownershipType = normalized.ownershipType || 'wishlist';
        } else {
            // Legacy owned item
            normalized.onWishlist = book.onWishlist ?? false;
        }
        delete normalized.isOwned;
    }

    // Handle legacy isWishlist field (internal format)
    if ('isWishlist' in book) {
        normalized.onWishlist = !!book.isWishlist;
        delete normalized.isWishlist;
    }

    // Ensure defaults
    normalized.onWishlist = normalized.onWishlist ?? false;
    normalized.ownershipType = normalized.ownershipType || 'purchased';

    return normalized;
};

// ===== Date/Time Formatting =====
// Calculate freshness status from fetchDate
const calculateFreshness = (fetchDate) => {
    if (!fetchDate) return 'unknown';

    const now = new Date();
    const fetchTime = new Date(fetchDate);
    const daysSinceFetch = (now - fetchTime) / (1000 * 60 * 60 * 24);

    if (daysSinceFetch < 7) return 'fresh';
    if (daysSinceFetch <= 30) return 'stale';
    return 'obsolete';
};

// Format relative time for display
const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown';

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${diffDays}d ago`;
};
