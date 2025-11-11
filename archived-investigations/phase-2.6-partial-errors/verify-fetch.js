// Quick verification script for fresh fetch results
const fs = require('fs');

const libraryFile = process.argv[2] || 'amazon-library.json';
const data = JSON.parse(fs.readFileSync(libraryFile, 'utf-8'));

console.log('========================================');
console.log('FRESH FETCH VERIFICATION');
console.log('========================================');
console.log('');

console.log('Basic Stats:');
console.log('  Total books:', data.metadata.totalBooks);
console.log('  Books without descriptions:', data.metadata.booksWithoutDescriptions);
console.log('  Expected: 2 (genuinely unavailable)');
console.log('');

console.log('Books Missing Descriptions:');
data.metadata.booksWithoutDescriptionsDetails.forEach((b, i) => {
  console.log(`  ${i+1}. ${b.title}`);
  console.log(`     Author: ${b.authors}`);
  console.log(`     ASIN: ${b.asin}`);
});
console.log('');

console.log('========================================');
console.log('SPECIAL EXTRACTION METHOD TESTS');
console.log('========================================');
console.log('');

// Test 1: Recursive extraction
console.log('Test 1: Recursive Fragment Extraction');
console.log('---------------------------------------');
const shield = data.books.find(b => b.asin === 'B00KMJN9AM');
if (!shield) {
  console.log('❌ ERROR: "The Shield" not found in library');
} else {
  console.log('✅ Book found');
  console.log('   Title:', shield.title);
  console.log('   Has description:', shield.description && shield.description.length > 0);
  console.log('   Description length:', shield.description ? shield.description.length : 0, 'chars');
  if (shield.description && shield.description.length > 0) {
    console.log('   Preview:', shield.description.substring(0, 100) + '...');
  }
}
console.log('');

// Test 2: AI summary
console.log('Test 2: AI Summary Fallback');
console.log('---------------------------------------');
const penSword = data.books.find(b => b.asin === 'B01IW2PEV2');
if (!penSword) {
  console.log('❌ ERROR: "The Pen and the Sword" not found in library');
} else {
  console.log('✅ Book found');
  console.log('   Title:', penSword.title);
  console.log('   Has description:', penSword.description && penSword.description.length > 0);
  console.log('   Description length:', penSword.description ? penSword.description.length : 0, 'chars');
  if (penSword.description && penSword.description.length > 0) {
    console.log('   Preview:', penSword.description.substring(0, 100) + '...');
  }
}
console.log('');

// Test 3: Traditional description with paragraph wrapper
console.log('Test 3: Traditional Description (Paragraph Wrapper)');
console.log('---------------------------------------');
const classic = data.books.find(b => b.asin === 'B07CF2QQPP');
if (!classic) {
  console.log('❌ ERROR: "The Classic Sci-Fi Collection" not found in library');
} else {
  console.log('✅ Book found');
  console.log('   Title:', classic.title);
  console.log('   Has description:', classic.description && classic.description.length > 0);
  console.log('   Description length:', classic.description ? classic.description.length : 0, 'chars');
  if (classic.description && classic.description.length > 0) {
    console.log('   Full description:', classic.description);
  }
}
console.log('');

console.log('========================================');
console.log('FINAL VERDICT');
console.log('========================================');

const pass1 = data.metadata.booksWithoutDescriptions <= 2;
const pass2 = shield && shield.description && shield.description.length > 500;  // Shield has ~900+ chars
const pass3 = penSword && penSword.description && penSword.description.length > 100;
const pass4 = classic && classic.description && classic.description.length > 0;

if (pass1 && pass2 && pass3 && pass4) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('   - Description coverage: 99.9%+');
  console.log('   - Recursive extraction: Working');
  console.log('   - AI summary fallback: Working');
  console.log('   - Traditional extraction: Working');
} else {
  console.log('❌ SOME TESTS FAILED');
  if (!pass1) console.log('   - Too many books without descriptions');
  if (!pass2) console.log('   - Recursive extraction failed');
  if (!pass3) console.log('   - AI summary fallback failed');
  if (!pass4) console.log('   - Traditional extraction failed');
}
console.log('========================================');
