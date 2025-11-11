// Comprehensive library analysis script
const fs = require('fs');

const libraryFile = process.argv[2] || 'amazon-library.json';
const lib = JSON.parse(fs.readFileSync(libraryFile, 'utf-8'));

console.log('========================================');
console.log('LIBRARY ANALYSIS');
console.log('========================================');
console.log('');

// 1. API Error Impact
console.log('1. API ERROR IMPACT');
console.log('-------------------');
const booksWithoutReviews = lib.books.filter(b => !b.topReviews || b.topReviews.length === 0);
const booksWithoutDesc = lib.books.filter(b => !b.description || b.description.length === 0);
const booksWithoutBoth = lib.books.filter(b =>
  (!b.description || b.description.length === 0) &&
  (!b.topReviews || b.topReviews.length === 0)
);

console.log('Total books:', lib.books.length);
console.log('Books without reviews:', booksWithoutReviews.length);
console.log('Books without descriptions:', booksWithoutDesc.length);
console.log('Books without BOTH:', booksWithoutBoth.length);
console.log('');

console.log('Books without descriptions:');
booksWithoutDesc.forEach(b => {
  console.log('  -', b.title);
  console.log('    ASIN:', b.asin);
  console.log('    Has reviews:', b.topReviews && b.topReviews.length > 0);
  console.log('    Binding:', b.binding);
});
console.log('');

// 2. Binding Analysis
console.log('2. BINDING TYPES ANALYSIS');
console.log('-------------------------');
const bindingCounts = {};
lib.books.forEach(b => {
  const binding = b.binding || 'undefined';
  bindingCounts[binding] = (bindingCounts[binding] || 0) + 1;
});

const sortedBindings = Object.entries(bindingCounts).sort((a, b) => b[1] - a[1]);
console.log('Unique binding types:', sortedBindings.length);
console.log('');
sortedBindings.forEach(([binding, count]) => {
  console.log(`  ${binding}: ${count} books`);
});
console.log('');

// 3. Multiple Authors Analysis
console.log('3. MULTIPLE AUTHORS ANALYSIS');
console.log('----------------------------');
const multipleAuthors = lib.books.filter(b => b.authors && b.authors.includes(','));
console.log('Books with multiple authors (comma-separated):', multipleAuthors.length);
console.log('');
console.log('First 10 examples:');
multipleAuthors.slice(0, 10).forEach(b => {
  console.log('  -', b.title);
  console.log('    Authors:', b.authors);
});
console.log('');

// 4. Last 10 Books in Library
console.log('4. LAST 10 BOOKS IN LIBRARY');
console.log('---------------------------');
const last10 = lib.books.slice(-10);
last10.forEach((b, i) => {
  const index = lib.books.length - 10 + i;
  console.log(`  [${index}] ${b.title}`);
  console.log(`      ASIN: ${b.asin}`);
  console.log(`      Authors: ${b.authors}`);
  console.log(`      Binding: ${b.binding}`);
});
console.log('');

// 5. Find specific books you mentioned
console.log('5. BOOKS YOU MENTIONED AS MISSING');
console.log('----------------------------------');
const searchTitles = [
  'Core Java',
  'Princess in Love'
];

searchTitles.forEach(search => {
  const found = lib.books.filter(b => b.title && b.title.includes(search));
  console.log(`Search: "${search}"`);
  if (found.length === 0) {
    console.log('  NOT FOUND');
  } else {
    found.forEach(b => {
      console.log('  -', b.title);
      console.log('    ASIN:', b.asin);
      console.log('    Authors:', b.authors);
      console.log('    Index:', lib.books.indexOf(b));
    });
  }
  console.log('');
});

console.log('========================================');
