// analyze-review-data.js
// Analyzes review data completeness in amazon-library.json
// Compares reviewCount vs topReviews.length to identify missing review data

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('REVIEW DATA ANALYSIS');
console.log('='.repeat(80));
console.log('');

// Load library
const libraryPath = path.join(__dirname, 'amazon-library.json');
if (!fs.existsSync(libraryPath)) {
    console.error('ERROR: amazon-library.json not found');
    process.exit(1);
}

const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const books = library.books || [];

console.log(`Total books in library: ${books.length}`);
console.log('');

// Categorize books
const categories = {
    good: [],           // reviewCount matches topReviews.length
    sizeMismatch: [],   // reviewCount > 0 but topReviews is empty or mismatched
    noReviews: []       // reviewCount = 0 or missing, topReviews empty
};

books.forEach((book, idx) => {
    const reviewCount = parseInt(book.reviewCount?.replace(/,/g, '') || '0', 10);
    const topReviewsCount = book.topReviews?.length || 0;

    // FIXED LOGIC:
    // - Good: Has reviews AND has topReviews array with entries
    // - Size mismatch: Claims to have reviews but topReviews is empty
    // - No reviews: No reviews claimed and no topReviews

    if (reviewCount === 0 && topReviewsCount === 0) {
        categories.noReviews.push({
            position: idx + 1,
            title: book.title,
            asin: book.asin,
            reviewCount: 0,
            topReviewsCount: 0
        });
    } else if (reviewCount > 0 && topReviewsCount === 0) {
        // HAS reviews according to reviewCount but NO topReviews returned
        categories.sizeMismatch.push({
            position: idx + 1,
            title: book.title,
            asin: book.asin,
            reviewCount,
            topReviewsCount,
            rating: book.rating || 'N/A'
        });
    } else if (reviewCount > 0 && topReviewsCount > 0) {
        // HAS reviews AND has topReviews array with data
        categories.good.push({
            position: idx + 1,
            title: book.title,
            asin: book.asin,
            reviewCount,
            topReviewsCount
        });
    } else {
        // Edge case: reviewCount = 0 but topReviews has data (shouldn't happen)
        categories.sizeMismatch.push({
            position: idx + 1,
            title: book.title,
            asin: book.asin,
            reviewCount,
            topReviewsCount,
            rating: book.rating || 'N/A',
            note: 'ANOMALY: No reviewCount but has topReviews'
        });
    }
});

// Calculate percentages
const total = books.length;
const goodPct = ((categories.good.length / total) * 100).toFixed(1);
const mismatchPct = ((categories.sizeMismatch.length / total) * 100).toFixed(1);
const noReviewsPct = ((categories.noReviews.length / total) * 100).toFixed(1);

// Output results
console.log('CATEGORY 1 - GOOD (has reviewCount AND topReviews data):');
console.log(`  Count: ${categories.good.length} books (${goodPct}%)`);
if (categories.good.length > 0) {
    console.log(`  Sample (first 5):`);
    categories.good.slice(0, 5).forEach(book => {
        console.log(`    - ${book.title.substring(0, 50)}: ${book.reviewCount.toLocaleString()} reviews, ${book.topReviewsCount} topReviews`);
    });
}
console.log('');

console.log('CATEGORY 2 - SIZE MISMATCH (reviewCount > 0 but topReviews EMPTY):');
console.log(`  Count: ${categories.sizeMismatch.length} books (${mismatchPct}%)`);
console.log('');

if (categories.sizeMismatch.length > 0) {
    // Sort by reviewCount descending
    const sorted = categories.sizeMismatch.sort((a, b) => b.reviewCount - a.reviewCount);

    console.log('  Top 20 by reviewCount:');
    sorted.slice(0, 20).forEach((book, idx) => {
        console.log(`    ${idx + 1}. ${book.title.substring(0, 60)}`);
        console.log(`       ASIN: ${book.asin}`);
        console.log(`       reviewCount: ${book.reviewCount.toLocaleString()}, topReviews: ${book.topReviewsCount}, rating: ${book.rating}`);
        console.log('');
    });
}

console.log('CATEGORY 3 - NO REVIEWS (reviewCount = 0, topReviews empty):');
console.log(`  Count: ${categories.noReviews.length} books (${noReviewsPct}%)`);
console.log('');

// Statistics
console.log('='.repeat(80));
console.log('STATISTICS');
console.log('='.repeat(80));
console.log('');

// Review count thresholds
const thresholds = [1000, 500, 100, 50];
thresholds.forEach(threshold => {
    const total = books.filter(b => {
        const count = parseInt(b.reviewCount?.replace(/,/g, '') || '0', 10);
        return count >= threshold;
    }).length;

    const mismatched = categories.sizeMismatch.filter(b => b.reviewCount >= threshold).length;
    const pct = total > 0 ? ((mismatched / total) * 100).toFixed(1) : '0.0';

    console.log(`Books with >=${threshold} reviews: ${total} total, ${mismatched} have empty topReviews (${pct}%)`);
});

console.log('');

// Median reviewCount for mismatched books
if (categories.sizeMismatch.length > 0) {
    const counts = categories.sizeMismatch.map(b => b.reviewCount).sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    const mean = (counts.reduce((sum, c) => sum + c, 0) / counts.length).toFixed(0);

    console.log(`Size-mismatch books review statistics:`);
    console.log(`  Median reviewCount: ${median}`);
    console.log(`  Mean reviewCount: ${mean}`);
    console.log(`  Min reviewCount: ${counts[0]}`);
    console.log(`  Max reviewCount: ${counts[counts.length - 1]}`);
    console.log('');
}

// Correlation test
if (categories.sizeMismatch.length > 0 && categories.good.length > 0) {
    const mismatchHighCount = categories.sizeMismatch.filter(b => b.reviewCount >= 500).length;
    const goodHighCount = categories.good.filter(b => b.reviewCount >= 500).length;
    const totalHighCount = mismatchHighCount + goodHighCount;

    const mismatchPctOfHigh = totalHighCount > 0 ? ((mismatchHighCount / totalHighCount) * 100).toFixed(1) : '0.0';

    console.log('Hypothesis: Does high reviewCount correlate with missing topReviews?');
    console.log(`  Books with >=500 reviews: ${totalHighCount} total`);
    console.log(`    - With topReviews: ${goodHighCount} (${(100 - parseFloat(mismatchPctOfHigh)).toFixed(1)}%)`);
    console.log(`    - WITHOUT topReviews: ${mismatchHighCount} (${mismatchPctOfHigh}%)`);

    if (mismatchHighCount > goodHighCount) {
        console.log('  ✅ CORRELATION: High review count books MORE likely to have missing topReviews');
    } else {
        console.log('  ❌ NO CORRELATION: Review count does not predict missing topReviews');
    }
    console.log('');
} else if (categories.sizeMismatch.length === 0) {
    console.log('✅ NO SIZE MISMATCHES - All books with reviews have topReviews data!');
    console.log('');
} else if (categories.good.length === 0) {
    console.log('⚠️  ALL books with reviews are missing topReviews data!');
    console.log('');
}

// Save detailed results
const outputPath = path.join(__dirname, 'review-data-analysis.txt');
const output = [];

output.push('='.repeat(80));
output.push('REVIEW DATA ANALYSIS - DETAILED RESULTS');
output.push('='.repeat(80));
output.push('');
output.push(`Analysis Date: ${new Date().toISOString()}`);
output.push(`Library: ${libraryPath}`);
output.push(`Total Books: ${total}`);
output.push('');

output.push('SUMMARY:');
output.push(`  Good: ${categories.good.length} (${goodPct}%)`);
output.push(`  Size Mismatch: ${categories.sizeMismatch.length} (${mismatchPct}%)`);
output.push(`  No Reviews: ${categories.noReviews.length} (${noReviewsPct}%)`);
output.push('');

output.push('='.repeat(80));
output.push('ALL SIZE-MISMATCH BOOKS (sorted by reviewCount)');
output.push('='.repeat(80));
output.push('');

const sorted = categories.sizeMismatch.sort((a, b) => b.reviewCount - a.reviewCount);
sorted.forEach((book, idx) => {
    output.push(`${idx + 1}. ${book.title}`);
    output.push(`   Position: ${book.position}`);
    output.push(`   ASIN: ${book.asin}`);
    output.push(`   reviewCount: ${book.reviewCount.toLocaleString()}`);
    output.push(`   topReviews: ${book.topReviewsCount}`);
    output.push(`   rating: ${book.rating}`);
    output.push('');
});

fs.writeFileSync(outputPath, output.join('\n'), 'utf8');

console.log('='.repeat(80));
console.log(`Detailed results saved to: ${outputPath}`);
console.log('='.repeat(80));
console.log('');

console.log('RECOMMENDED TEST BOOKS (top 3 for browser console tests):');
if (sorted.length >= 3) {
    sorted.slice(0, 3).forEach((book, idx) => {
        console.log(`  ${idx + 1}. ${book.title.substring(0, 60)}`);
        console.log(`     ASIN: ${book.asin}, reviewCount: ${book.reviewCount.toLocaleString()}`);
    });
} else {
    console.log('  Less than 3 size-mismatch books found');
}
console.log('');
