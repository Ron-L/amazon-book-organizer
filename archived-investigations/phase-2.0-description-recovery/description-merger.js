// Description Merger Script v1 (THROWAWAY - for recovery only)
// Merges recovered descriptions into amazon-library.json
//
// Usage: node description-merger.js
//
// This script:
// 1. Loads amazon-library.json
// 2. Loads recovered-descriptions.json
// 3. Merges descriptions by ASIN
// 4. Creates amazon-library-merged.json (NEW FILE - does not modify original)
// 5. Updates metadata to reflect new description counts

const fs = require('fs');
const path = require('path');

function mergeDescriptions() {
    const SCRIPT_VERSION = 'v1';

    console.log('========================================');
    console.log(`Description Merger Script ${SCRIPT_VERSION}`);
    console.log('Merges recovered descriptions into library');
    console.log('========================================\n');

    // Step 1: Load library
    console.log('[1/4] Loading amazon-library.json...');
    const libraryPath = path.join(__dirname, 'amazon-library.json');

    if (!fs.existsSync(libraryPath)) {
        console.error('❌ amazon-library.json not found in current directory');
        console.error(`   Expected path: ${libraryPath}`);
        return;
    }

    const libraryText = fs.readFileSync(libraryPath, 'utf-8');
    const libraryData = JSON.parse(libraryText);

    // Validate schema
    if (!libraryData.metadata || !libraryData.books) {
        console.error('❌ Invalid library JSON format');
        console.error('   Expected schema v3.0.0: {metadata, books}');
        return;
    }

    console.log(`✅ Loaded library with ${libraryData.metadata.totalBooks} books`);

    // Step 2: Load recovered descriptions (both traditional and AI summaries)
    console.log('\n[2/4] Loading recovered descriptions...');

    // Load all recovered description files
    const recoveredPath = path.join(__dirname, 'recovered-descriptions.json');
    const aiRecoveredPath = path.join(__dirname, 'recovered-ai-descriptions.json');
    const v2RecoveredPath = path.join(__dirname, 'recovered-descriptions-v2.json');

    const allDescriptions = [];

    // Load traditional descriptions file
    if (fs.existsSync(recoveredPath)) {
        const recoveredText = fs.readFileSync(recoveredPath, 'utf-8');
        const recoveredData = JSON.parse(recoveredText);

        if (!recoveredData.metadata || !recoveredData.descriptions) {
            console.error('❌ Invalid recovered-descriptions.json format');
            return;
        }

        console.log(`✅ Loaded ${recoveredData.descriptions.length} traditional descriptions`);
        console.log(`   Fetch date: ${recoveredData.metadata.fetchDate}`);
        if (recoveredData.metadata.stopped) {
            console.log(`   ⚠️  Fetch was stopped at book ${recoveredData.metadata.stoppedAt}`);
        }

        allDescriptions.push(...recoveredData.descriptions);
    } else {
        console.log('⚠️  recovered-descriptions.json not found (skipping)');
    }

    // Load AI summaries file
    if (fs.existsSync(aiRecoveredPath)) {
        const aiRecoveredText = fs.readFileSync(aiRecoveredPath, 'utf-8');
        const aiRecoveredData = JSON.parse(aiRecoveredText);

        if (!aiRecoveredData.metadata || !aiRecoveredData.descriptions) {
            console.error('❌ Invalid recovered-ai-descriptions.json format');
            return;
        }

        console.log(`✅ Loaded ${aiRecoveredData.descriptions.length} AI summaries`);
        console.log(`   Source: ${aiRecoveredData.metadata.sourceType}`);
        console.log(`   Fetch date: ${aiRecoveredData.metadata.fetchDate}`);

        allDescriptions.push(...aiRecoveredData.descriptions);
    } else {
        console.log('⚠️  recovered-ai-descriptions.json not found (skipping)');
    }

    // Load v2 recursive extraction file
    if (fs.existsSync(v2RecoveredPath)) {
        const v2RecoveredText = fs.readFileSync(v2RecoveredPath, 'utf-8');
        const v2RecoveredData = JSON.parse(v2RecoveredText);

        if (!v2RecoveredData.metadata || !v2RecoveredData.descriptions) {
            console.error('❌ Invalid recovered-descriptions-v2.json format');
            return;
        }

        console.log(`✅ Loaded ${v2RecoveredData.descriptions.length} recursive extractions`);
        console.log(`   Source: ${v2RecoveredData.metadata.sourceType}`);
        console.log(`   Fetch date: ${v2RecoveredData.metadata.fetchDate}`);

        allDescriptions.push(...v2RecoveredData.descriptions);
    } else {
        console.log('⚠️  recovered-descriptions-v2.json not found (skipping)');
    }

    if (allDescriptions.length === 0) {
        console.error('❌ No recovered descriptions found');
        console.error('   Run description-fetcher.js, description-fetcher-ai.js, or description-fetcher-v2.js first');
        return;
    }

    console.log(`\n📊 Total descriptions to merge: ${allDescriptions.length}`);

    // Step 3: Merge descriptions
    console.log('\n[3/4] Merging descriptions into library...');

    // Create lookup map for fast ASIN matching
    const descriptionMap = new Map();
    allDescriptions.forEach(item => {
        descriptionMap.set(item.asin, item.description);
    });

    let mergedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // Track books that still don't have descriptions after merge
    const stillWithoutDescriptions = [];

    libraryData.books.forEach(book => {
        if (descriptionMap.has(book.asin)) {
            const newDesc = descriptionMap.get(book.asin);
            if (newDesc.length > 0) {
                book.description = newDesc;
                mergedCount++;
            } else {
                // Recovered but empty - book genuinely has no description on Amazon
                skippedCount++;
                if (book.description === '') {
                    stillWithoutDescriptions.push({
                        asin: book.asin,
                        title: book.title,
                        authors: book.authors
                    });
                }
            }
        } else {
            // Not in recovered list
            if (book.description === '') {
                notFoundCount++;
                stillWithoutDescriptions.push({
                    asin: book.asin,
                    title: book.title,
                    authors: book.authors
                });
            }
        }
    });

    console.log(`✅ Merge complete:`);
    console.log(`   ${mergedCount} descriptions added`);
    console.log(`   ${skippedCount} books had empty descriptions (genuinely unavailable)`);
    console.log(`   ${notFoundCount} books not in recovered list (still missing)`);

    // Step 4: Update metadata and save
    console.log('\n[4/4] Updating metadata and saving merged library...');

    libraryData.metadata.booksWithoutDescriptions = stillWithoutDescriptions.length;
    libraryData.metadata.booksWithoutDescriptionsDetails = stillWithoutDescriptions;
    libraryData.metadata.lastDescriptionMerge = new Date().toISOString();
    libraryData.metadata.descriptionsMerged = mergedCount;

    const outputPath = path.join(__dirname, 'amazon-library-merged.json');
    const jsonData = JSON.stringify(libraryData, null, 2);
    fs.writeFileSync(outputPath, jsonData, 'utf-8');

    console.log(`✅ Saved to: amazon-library-merged.json`);

    console.log('\n========================================');
    console.log('✅ MERGE COMPLETE!');
    console.log('========================================');
    console.log('📊 Summary:');
    console.log(`   Total books in library: ${libraryData.metadata.totalBooks}`);
    console.log(`   Descriptions merged: ${mergedCount}`);
    console.log(`   Books still without descriptions: ${stillWithoutDescriptions.length}`);
    console.log(`   Before merge: ${libraryData.metadata.booksWithoutDescriptions + mergedCount} missing`);
    console.log(`   After merge: ${stillWithoutDescriptions.length} missing`);
    console.log(`   Improvement: ${mergedCount} descriptions recovered`);

    console.log('\n👉 Next steps:');
    console.log('   1. Review amazon-library-merged.json to verify it looks correct');
    console.log('   2. If satisfied, rename it to amazon-library.json');
    console.log('      (Replace the old one, you have a backup)');
    console.log('   3. Load in organizer to verify descriptions appear');

    if (stillWithoutDescriptions.length > 0) {
        console.log(`\n⚠️  ${stillWithoutDescriptions.length} books still lack descriptions:`);
        console.log('   These may genuinely not have descriptions on Amazon');
        console.log('   Or the fetch was stopped before reaching them');
    }
}

// Run the merger
try {
    mergeDescriptions();
} catch (error) {
    console.error('\n========================================');
    console.error('❌ FATAL ERROR');
    console.error('========================================');
    console.error(error);
    console.error('========================================\n');
}
