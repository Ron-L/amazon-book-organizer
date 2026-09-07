// uiHelpers.js - UI helper functions and constants
// Extracted from readerwrangler.js for reuse by Book Explorer
// v5.0.0-alpha.1

// ===== Storage Keys =====
const STORAGE_KEY = "readerwrangler-state";
const CACHE_KEY = "readerwrangler-enriched-cache";
const SETTINGS_KEY = "readerwrangler-settings";
const STATUS_KEY = "readerwrangler-status";
const FILTERS_KEY = "readerwrangler-filters";
const EXPLORER_KEY = "readerwrangler-explorer"; // v5.0.0 - Explorer view settings
const FOLDERS_KEY = "readerwrangler-folders"; // v5.0.0 - User folder organization
const BOOKLISTS_KEY = "readerwrangler-booklists"; // v6.12.0 - Book Lists (curated, supplemental bookId sets)
const WIZARD_KEY = "readerwrangler-wizard"; // v5.1.0-alpha.23 - Wizard settings
const SEARCH_HISTORY_KEY = "readerwrangler-search-history"; // v5.4.9 - Search history
const THEME_KEY = "readerwrangler-theme"; // v5.5.7 - Theme preference
const RELAY_KEY = "readerwrangler-relay"; // v6.0.0 - Relay credentials (channelId, passphrase)
const RELAY_STATUS_KEY = "readerwrangler-relay-status"; // v6.9.0 - Persisted relay key status ('ok'|'revoked'|null)

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

// ===== Ownership =====
// v7.8.0 (onWishlist retirement, batch item 0) - THE wishlist-truth accessor, shared by the app
// and storage.js (uiHelpers loads first). ownershipType is the ONLY decision source fleet-wide;
// the onWishlist flag is legacy wire baggage kept for old backups/letters/bookmarklets. The
// fallback clause is the read-side backstop for stored books that predate ownershipType and
// never flow through normalizeBook again — the one place in this page allowed to read the flag.
// Invariant (ratified 2026-09-04): the pair never legitimately diverged; the flag was pure trap.
const isWishlisted = (book) => book.ownershipType === 'wishlist' || (!book.ownershipType && book.onWishlist === true);

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

    // v7.8.0 (item 0) - THE inbound normalization: a book arriving with only the legacy flag
    // gets the real type stamped BEFORE the purchased default below. Old backups and old
    // fetcher letters present the flag indefinitely — this line is kept forever.
    if (normalized.onWishlist && !normalized.ownershipType) normalized.ownershipType = 'wishlist';

    // Ensure defaults
    normalized.onWishlist = normalized.onWishlist ?? false;
    normalized.ownershipType = normalized.ownershipType || 'purchased';

    // v6.12.0 - F4 backfill: a hidden book is always user-hidden (no auto-hide path exists), so ensure
    // it carries the userEdited.isHidden flag. Without this, a book hidden before isHidden became a
    // tracked userEdited field has no flag, and the import merge silently un-hides it. normalizeBook
    // runs both on load and when building previousBook for the merge, so this protects historical hides.
    if (normalized.isHidden && !(normalized.userEdited && normalized.userEdited.isHidden)) {
        normalized.userEdited = { ...(normalized.userEdited || {}), isHidden: true };
    }

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
