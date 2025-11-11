// Find Empty Descriptions Script v1 (THROWAWAY - for testing only)
// Identifies all books in amazon-library.json with empty descriptions
//
// Usage: node find-empty-descriptions.js

const fs = require('fs');
const path = require('path');

function findEmptyDescriptions() {
    const SCRIPT_VERSION = 'v1';

    console.log('========================================');
    console.log(`Find Empty Descriptions Script ${SCRIPT_VERSION}`);
    console.log('Identifies books with empty descriptions');
    console.log('========================================\n');

    // Load amazon-library.json
    const libraryPath = path.join(__dirname, 'amazon-library.json');

    if (!fs.existsSync(libraryPath)) {
        console.error('❌ amazon-library.json not found in current directory');
        console.error(`   Expected path: ${libraryPath}`);
        return;
    }

    console.log('[1/3] Loading amazon-library.json...');
    const libraryText = fs.readFileSync(libraryPath, 'utf-8');
    const libraryData = JSON.parse(libraryText);

    // Handle schema v3.0.0 format
    if (!libraryData.metadata || !libraryData.books) {
        console.error('❌ Invalid library JSON format');
        console.error('   Expected schema v3.0.0: {metadata, books}');
        return;
    }

    console.log(`✅ Loaded library with ${libraryData.metadata.totalBooks} books\n`);

    // Find books with empty descriptions
    console.log('[2/3] Scanning for empty descriptions...');
    const emptyDescriptions = [];

    libraryData.books.forEach(book => {
        if (book.description === '') {
            emptyDescriptions.push({
                asin: book.asin,
                title: book.title,
                authors: book.authors
            });
        }
    });

    console.log(`✅ Found ${emptyDescriptions.length} books with empty descriptions\n`);

    // Display results
    console.log('[3/3] Books with empty descriptions:');
    console.log('========================================\n');

    if (emptyDescriptions.length === 0) {
        console.log('✅ All books have descriptions!');
        return;
    }

    emptyDescriptions.forEach((book, index) => {
        console.log(`${index + 1}. ${book.title}`);
        console.log(`   Author: ${book.authors}`);
        console.log(`   ASIN: ${book.asin}\n`);
    });

    // Write to JSON file for easy import into investigation script
    const outputPath = path.join(__dirname, 'books-without-descriptions.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(emptyDescriptions, null, 2),
        'utf-8'
    );

    console.log('========================================');
    console.log('✅ SCAN COMPLETE!');
    console.log('========================================');
    console.log(`Results saved to: books-without-descriptions.json`);
    console.log(`\nTotal books without descriptions: ${emptyDescriptions.length}`);
}

// Run the script
findEmptyDescriptions();
