// Unit tests for organizeEngine.js — run: node test/organizeEngine.test.js
const assert = require('assert');
const { groupBooksBySeries, computeOrganizePlan } = require('../organizeEngine.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ✓ ' + name); }

// Deterministic id generator for stable assertions.
function counterIdGen() {
    const counts = {};
    return (prefix) => { counts[prefix] = (counts[prefix] || 0) + 1; return prefix + '-' + counts[prefix]; };
}

// Fixture: two authors. Sanderson has a 2-book series (Mistborn) + a standalone; Herbert has one series book.
const books = [
    { id: 'b1', author: 'Brandon Sanderson', series: 'Mistborn', seriesPosition: 1, dateAdded: '2024-01-01' },
    { id: 'b2', author: 'Brandon Sanderson', series: 'Mistborn', seriesPosition: 2, dateAdded: '2024-01-02' },
    { id: 'b3', author: 'Brandon Sanderson', series: null,       seriesPosition: null, dateAdded: '2024-01-03' }, // standalone
    { id: 'b4', author: 'Frank Herbert',     series: 'Dune',     seriesPosition: 1, dateAdded: '2024-02-01' },    // single-book series
];
const inbox = { id: '__inbox__', name: 'Inbox', parentId: null, bookIds: ['b1', 'b2', 'b3', 'b4'] };
const sanderson = { displayName: 'Brandon Sanderson', books: books.filter(b => b.author === 'Brandon Sanderson') };
const herbert   = { displayName: 'Frank Herbert',     books: books.filter(b => b.author === 'Frank Herbert') };

console.log('organizeEngine tests:');

test('groupBooksBySeries splits series (position-sorted) from standalone', () => {
    const { seriesGroups, standaloneBooks } = groupBooksBySeries(sanderson.books);
    assert.strictEqual(seriesGroups.size, 1);
    assert.strictEqual(standaloneBooks.length, 1);
    const mistborn = seriesGroups.get('mistborn');
    assert.deepStrictEqual(mistborn.books.map(b => b.id), ['b1', 'b2']); // position order
});

test('By Author: creates Author folder + Series subfolder (2+), standalone to author root, empties Inbox', () => {
    const plan = computeOrganizePlan([sanderson], [inbox], {}, counterIdGen());
    const byName = n => plan.newFolders.find(f => f.name === n);
    const author = byName('Brandon Sanderson');
    const series = byName('Mistborn');
    assert.ok(author && author.parentId === null, 'author folder at root');
    assert.ok(series && series.parentId === author.id, 'series folder under author');
    assert.deepStrictEqual(series.bookIds, ['b1', 'b2'], 'series books in position order');
    assert.deepStrictEqual(author.bookIds, ['b3'], 'standalone at author root (no Misc by default)');
    const inboxAfter = plan.newFolders.find(f => f.id === '__inbox__');
    assert.deepStrictEqual(inboxAfter.bookIds, ['b4'], 'organized books removed from Inbox; b4 (Herbert) untouched');
    assert.strictEqual(plan.totalBooksOrganized, 3);
    assert.deepStrictEqual(plan.createdFolders, ['Brandon Sanderson']);
});

test('single-book series stays at author root (no lone series subfolder)', () => {
    const plan = computeOrganizePlan([herbert], [inbox], {}, counterIdGen());
    assert.ok(!plan.newFolders.some(f => f.name === 'Dune'), 'no Dune subfolder for a single book');
    const author = plan.newFolders.find(f => f.name === 'Frank Herbert');
    assert.deepStrictEqual(author.bookIds, ['b4']);
});

test('purity: existingFolders is not mutated', () => {
    const before = JSON.stringify(inbox);
    computeOrganizePlan([sanderson], [inbox], {}, counterIdGen());
    assert.strictEqual(JSON.stringify(inbox), before, 'input Inbox object unchanged');
});

test('merge: re-organizing into an existing author/series folder dedups, does not duplicate', () => {
    const existing = [
        { id: '__inbox__', name: 'Inbox', parentId: null, bookIds: ['b1', 'b2'] },
        { id: 'fa', name: 'Brandon Sanderson', parentId: null, bookIds: [] },
        { id: 'fs', name: 'Mistborn', parentId: 'fa', bookIds: ['b1'] }, // b1 already filed
    ];
    const plan = computeOrganizePlan([sanderson], existing, {}, counterIdGen());
    const series = plan.newFolders.find(f => f.name === 'Mistborn');
    assert.deepStrictEqual(series.bookIds, ['b1', 'b2'], 'b1 kept once, b2 added');
    assert.deepStrictEqual(plan.mergedFolders, ['Brandon Sanderson'], 'author folder merged, not recreated');
});

test('seriesFolderMinBooks:1 gives a single-book series its own folder', () => {
    const plan = computeOrganizePlan([herbert], [inbox], { seriesFolderMinBooks: 1 }, counterIdGen());
    const author = plan.newFolders.find(f => f.name === 'Frank Herbert');
    const dune = plan.newFolders.find(f => f.name === 'Dune');
    assert.ok(dune && dune.parentId === author.id, 'Dune subfolder created under Frank Herbert');
    assert.deepStrictEqual(dune.bookIds, ['b4']);
    assert.deepStrictEqual(author.bookIds, [], 'no books left at author root');
});

test('seriesFolderMinBooks:1 still routes true standalones (no series) to author root', () => {
    const plan = computeOrganizePlan([sanderson], [inbox], { seriesFolderMinBooks: 1 }, counterIdGen());
    const author = plan.newFolders.find(f => f.name === 'Brandon Sanderson');
    const mistborn = plan.newFolders.find(f => f.name === 'Mistborn');
    assert.deepStrictEqual(mistborn.bookIds, ['b1', 'b2'], 'series still folds');
    assert.deepStrictEqual(author.bookIds, ['b3'], 'b3 (no series) stays at author root');
});

test('createSeriesFolders:false files everything flat at author root', () => {
    const plan = computeOrganizePlan([sanderson], [inbox], { createSeriesFolders: false }, counterIdGen());
    assert.ok(!plan.newFolders.some(f => f.name === 'Mistborn'), 'no series subfolder');
    const author = plan.newFolders.find(f => f.name === 'Brandon Sanderson');
    assert.deepStrictEqual(author.bookIds.sort(), ['b1', 'b2', 'b3']);
});

console.log(`\nAll ${passed} tests passed.`);
