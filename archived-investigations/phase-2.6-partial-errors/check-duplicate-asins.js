// Quick diagnostic script to check for duplicate ASINs in library
// Run this in browser console after loading amazon-library.json

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('amazon-library.json', 'utf8'));

console.log('========================================');
console.log('DUPLICATE ASIN CHECK');
console.log('========================================');
console.log('');

const books = data.books;
console.log(`Total books in library: ${books.length}`);
console.log('');

// Build ASIN frequency map
const asinMap = new Map();
const duplicates = [];

books.forEach((book, index) => {
    const asin = book.asin;

    if (!asin) {
        console.log(`⚠️  Book at index ${index} has no ASIN: "${book.title}"`);
        return;
    }

    if (asinMap.has(asin)) {
        // Duplicate found
        const firstIndex = asinMap.get(asin);
        duplicates.push({
            asin,
            firstIndex,
            firstTitle: books[firstIndex].title,
            firstBinding: books[firstIndex].binding || 'Unknown',
            secondIndex: index,
            secondTitle: book.title,
            secondBinding: book.binding || 'Unknown'
        });
    } else {
        asinMap.set(asin, index);
    }
});

console.log('========================================');
console.log('RESULTS');
console.log('========================================');
console.log('');

if (duplicates.length === 0) {
    console.log('✅ No duplicate ASINs found!');
    console.log(`   All ${books.length} books have unique ASINs.`);
} else {
    console.log(`❌ Found ${duplicates.length} duplicate ASIN(s):`);
    console.log('');

    duplicates.forEach((dup, i) => {
        console.log(`Duplicate #${i + 1}:`);
        console.log(`  ASIN: ${dup.asin}`);
        console.log(`  First occurrence (index ${dup.firstIndex}):`);
        console.log(`    Title: ${dup.firstTitle}`);
        console.log(`    Binding: ${dup.firstBinding}`);
        console.log(`  Second occurrence (index ${dup.secondIndex}):`);
        console.log(`    Title: ${dup.secondTitle}`);
        console.log(`    Binding: ${dup.secondBinding}`);
        console.log('');
    });
}

console.log('');
console.log('========================================');
console.log('RECOMMENDATIONS');
console.log('========================================');
console.log('');

if (duplicates.length > 0) {
    console.log('If duplicates exist, possible solutions:');
    console.log('1. Deduplicate during organizer load (keep first occurrence)');
    console.log('2. Use compound ID: ASIN + binding type');
    console.log('3. Investigate why library has duplicates (fetcher bug?)');
} else {
    console.log('Library is clean - duplicate ASIN detection is not needed.');
}
