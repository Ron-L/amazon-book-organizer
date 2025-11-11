// Compare old and new library files
const fs = require('fs');

const oldPath = process.argv[2] || 'recovery-scripts/amazon-library - Copy (3).json';
const newPath = process.argv[3] || 'amazon-library (1).json';

const oldLib = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
const newLib = JSON.parse(fs.readFileSync(newPath, 'utf-8'));

console.log('========================================');
console.log('LIBRARY DIFF');
console.log('========================================');
console.log('');

console.log('OLD library:', oldLib.books.length, 'books');
console.log('NEW library:', newLib.books.length, 'books');
console.log('Difference:', newLib.books.length - oldLib.books.length);
console.log('');

// Books added/removed
const oldASINs = new Set(oldLib.books.map(b => b.asin));
const newASINs = new Set(newLib.books.map(b => b.asin));
const added = newLib.books.filter(b => !oldASINs.has(b.asin));
const removed = oldLib.books.filter(b => !newASINs.has(b.asin));

console.log('========================================');
console.log('BOOKS ADDED:', added.length);
console.log('========================================');
added.forEach(b => {
  console.log('  + [ADDED]', b.title);
  console.log('    ASIN:', b.asin);
  console.log('    Binding:', b.binding);
  console.log('    Authors:', b.authors);
  console.log('');
});

console.log('========================================');
console.log('BOOKS REMOVED:', removed.length);
console.log('========================================');
if (removed.length > 0) {
  removed.forEach(b => {
    console.log('  - [REMOVED]', b.title);
    console.log('    ASIN:', b.asin);
    console.log('');
  });
} else {
  console.log('(none)');
  console.log('');
}

// Description changes
console.log('========================================');
console.log('DESCRIPTION CHANGES');
console.log('========================================');

const descGained = [];
const descLost = [];

oldLib.books.forEach(oldBook => {
  const newBook = newLib.books.find(b => b.asin === oldBook.asin);
  if (newBook) {
    const oldHasDesc = oldBook.description && oldBook.description.length > 0;
    const newHasDesc = newBook.description && newBook.description.length > 0;

    if (!oldHasDesc && newHasDesc) {
      descGained.push({
        title: oldBook.title,
        asin: oldBook.asin,
        oldLen: 0,
        newLen: newBook.description.length
      });
    } else if (oldHasDesc && !newHasDesc) {
      descLost.push({
        title: oldBook.title,
        asin: oldBook.asin,
        oldLen: oldBook.description.length,
        newLen: 0
      });
    }
  }
});

console.log('Books that GAINED descriptions:', descGained.length);
descGained.forEach(c => {
  console.log('  + [GAINED]', c.title);
  console.log('    ASIN:', c.asin);
  console.log('    Description length:', c.newLen, 'chars');
});
console.log('');

console.log('Books that LOST descriptions:', descLost.length);
if (descLost.length > 0) {
  descLost.forEach(c => {
    console.log('  - [LOST]', c.title);
    console.log('    ASIN:', c.asin);
    console.log('    Was:', c.oldLen, 'chars');
  });
} else {
  console.log('(none - good!)');
}
console.log('');

// Metadata comparison
console.log('========================================');
console.log('METADATA COMPARISON');
console.log('========================================');
console.log('Old library:');
console.log('  Schema:', oldLib.metadata.schemaVersion);
console.log('  Fetcher:', oldLib.metadata.fetcherVersion);
console.log('  Fetch date:', oldLib.metadata.fetchDate);
console.log('  Books without descriptions:', oldLib.metadata.booksWithoutDescriptions);
console.log('');
console.log('New library:');
console.log('  Schema:', newLib.metadata.schemaVersion);
console.log('  Fetcher:', newLib.metadata.fetcherVersion);
console.log('  Fetch date:', newLib.metadata.fetchDate);
console.log('  Books without descriptions:', newLib.metadata.booksWithoutDescriptions);
console.log('');

console.log('========================================');
console.log('SUMMARY');
console.log('========================================');
console.log('Net change:', newLib.books.length - oldLib.books.length, 'books');
console.log('Description improvement:', oldLib.metadata.booksWithoutDescriptions - newLib.metadata.booksWithoutDescriptions, 'fewer missing');
console.log('========================================');
