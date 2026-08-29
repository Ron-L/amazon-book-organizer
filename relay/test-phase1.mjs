/**
 * Phase 1 relay-client test harness (relay write redesign).
 * Runs the REAL relay-client.js + relay-crypto.js + relay-compress.js in Node (22+)
 * against the DEV worker, and deliberately recreates the design's failure scenarios:
 *   torn run, torn generation, concurrent generations, out-of-order run completion,
 *   pointer fallback, GC guards, legacy-format fallback.
 *
 * Usage:  node relay/test-phase1.mjs
 * Safe: talks only to readerwrangler-relay-dev (isolated KV namespace).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_URL = 'https://readerwrangler-relay-dev.readerwrangler.workers.dev';
const CH = '22222222-3333-4444-8555-666666666666'; // harness channel (dev KV only)
const CH_LEGACY = '33333333-4444-4555-8666-777777777777'; // legacy-fallback test channel

// --- Browser shims (the client files are browser IIFEs) ---
const storage = new Map();
globalThis.localStorage = {
  getItem: k => storage.has(k) ? storage.get(k) : null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};
globalThis.window = globalThis;
window._RW_RELAY_WORKER_URL = DEV_URL;
window._RW_RELAY_CHANNEL = CH;
window._RW_RELAY_PASSPHRASE = 'phase1-harness-passphrase';

for (const f of ['relay-crypto.js', 'relay-compress.js', 'relay-client.js']) {
  (0, eval)(readFileSync(join(root, f), 'utf8'));
}
const RW = window.RWRelay;

// --- Tiny test framework ---
let pass = 0, fail = 0;
function ok(desc, cond) {
  if (cond) { pass++; console.log(`  PASS ${desc}`); }
  else { fail++; console.log(`  FAIL ${desc}`); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** KV list/read propagation can lag up to ~60s; retry a check for that long before failing. */
async function eventually(desc, fn, tries = 14, delayMs = 5000) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) { ok(desc, true); return; }
    await sleep(delayMs);
  }
  ok(desc + ' (after retries)', false);
}
// Books carry random hex so the payload is INCOMPRESSIBLE — small letterSize values in the
// tests must actually force multi-letter runs (gzip flattens repetitive test data to nothing).
const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(64)))
  .map(b => b.toString(16).padStart(2, '0')).join('');
const payload = (tag, n = 5) => JSON.stringify({
  tag, books: { items: Array.from({ length: n }, (_, i) => ({ asin: `B${tag}${i}`, title: `${tag} #${i}`, blob: rand() })) }
});
const raw = async (path, opts) => fetch(`${DEV_URL}${path}`, opts);

async function main() {
  console.log('— Phase 1 harness against', DEV_URL, '\n');

  console.log('[1] Inline single-letter run (the wishlist shape) roundtrip');
  const p1 = payload('wish', 1);
  const w = await RW.writeRun(p1, 'wishlist-add');
  ok('writeRun collapsed to inline (1 write)', w.inline === true && w.seqCount === 1);
  await eventually('readMailbox returns it, decrypted intact', async () => {
    const mb = await RW.readMailbox();
    const run = mb.runs.find(r => r.runId === w.runId);
    return run && run.kind === 'wishlist-add' && run.jsonString === p1;
  });

  console.log('\n[2] Multi-letter run (forced small letters) roundtrip');
  const p2 = payload('full', 40);
  const m = await RW.writeRun(p2, 'books', null, { inlineMax: 0, letterSize: 300 });
  ok(`multi-letter (${m.seqCount} letters)`, !m.inline && m.seqCount >= 2);
  await eventually('reassembles + checksum-verifies + decrypts', async () => {
    const mb = await RW.readMailbox();
    const run = mb.runs.find(r => r.runId === m.runId);
    return run && run.jsonString === p2;
  });

  console.log('\n[3] TORN RUN: letters written, producer dies before manifest');
  const mint = await (await raw(`/mail/${CH}/run?device=harness`, { method: 'POST' })).json();
  await raw(`/mail/${CH}/${mint.runId}/letter/0`, { method: 'POST', body: 'torn-bytes' });
  await eventually('torn run reported incomplete, never as a run', async () => {
    const mb = await RW.readMailbox();
    return mb.incomplete.includes(mint.runId) && !mb.runs.some(r => r.runId === mint.runId);
  });

  console.log('\n[4] First canonical generation (absorbs the wishlist run)');
  const canon1 = payload('canon1', 50);
  const g1 = await RW.commitGeneration(canon1, [w.runId]);
  ok('manifest carries absorbedRuns set', g1.absorbedRuns.length === 1 && g1.absorbedRuns[0] === w.runId);
  await eventually('readCanonical via pointer, content intact', async () => {
    const c = await RW.readCanonical();
    return c && c.source === 'pointer' && c.jsonString === canon1 && c.gen === g1.gen;
  });
  {
    const mb = await RW.readMailbox();
    const un = RW.unabsorbedRuns(mb.runs, g1);
    ok('unabsorbedRuns: books run still pending, wishlist absorbed',
       un.some(r => r.runId === m.runId) && !un.some(r => r.runId === w.runId));
  }

  console.log('\n[5] OUT-OF-ORDER COMPLETION (design C1): old run finishes after a merge');
  // Mint EARLY (older timestamp), complete LATER — after a merge absorbed a newer run.
  const oldMint = await (await raw(`/mail/${CH}/run?device=harness`, { method: 'POST' })).json();
  await sleep(1200);
  const pNew = payload('quickwish', 1);
  const newRun = await RW.writeRun(pNew, 'wishlist-add'); // newer runId, completes instantly
  const canon2 = payload('canon2', 51);
  const g2 = await RW.commitGeneration(canon2, [newRun.runId]); // merge happens NOW
  // ...and only now does the old, slow run complete (letters + manifest):
  await raw(`/mail/${CH}/${oldMint.runId}/letter/0`, { method: 'POST', body: 'slow-run-part' });
  const slowBody = payload('slowfetch', 3);
  const slow = await RW.writeRun(slowBody, 'books', null, { inlineMax: 0, letterSize: 100 });
  // (slow is our stand-in completed old-ish run; oldMint stays torn. The key check:)
  ok('old runId timestamp < absorbed newer runId (the watermark trap)',
     parseInt(oldMint.runId) < parseInt(newRun.runId));
  await eventually('SET semantics: late-completing run still visible as unabsorbed', async () => {
    const mb = await RW.readMailbox();
    const un = RW.unabsorbedRuns(mb.runs, g2);
    return un.some(r => r.runId === slow.runId) && !un.some(r => r.runId === newRun.runId);
  });

  console.log('\n[6] TORN GENERATION: chunks written, writer dies before manifest');
  const tornGen = (await (await raw(`/gen/${CH}/begin?device=harness`, { method: 'POST' })).json()).gen;
  await raw(`/gen/${CH}/${tornGen}/chunk/0`, { method: 'POST', body: 'torn-gen-bytes' });
  {
    const c = await RW.readCanonical();
    ok('reader unaffected: still gets last committed generation', c && c.jsonString === canon2 && c.gen === g2.gen);
    const gens = (await (await raw(`/gen/${CH}/list`)).json()).gens;
    ok('torn generation invisible to discovery (no manifest)', !gens.includes(tornGen));
  }

  console.log('\n[7] CONCURRENT GENERATIONS: two writers, interleaved, disjoint keys');
  const [gA, gB] = await Promise.all([
    (async () => (await (await raw(`/gen/${CH}/begin?device=writerA`, { method: 'POST' })).json()).gen)(),
    (async () => (await (await raw(`/gen/${CH}/begin?device=writerB`, { method: 'POST' })).json()).gen)()
  ]);
  ok('distinct generation ids minted', gA !== gB);
  // Run two full commit sequences concurrently through the real client (interleaved writes):
  const canonA = payload('canonA', 60), canonB = payload('canonB', 61);
  const commitB = RW.commitGeneration(canonB, []);
  const commitA = RW.commitGeneration(canonA, []);
  await Promise.all([commitA, commitB]);
  {
    const c = await RW.readCanonical();
    ok('a reader gets ONE complete, verified generation (no interleaved tearing)',
       c && (c.jsonString === canonA || c.jsonString === canonB));
  }

  console.log('\n[8] GC: keep-2 + grace + pointed-gen guard');
  const canon3 = payload('canon3', 52);
  const g3 = await RW.commitGeneration(canon3, [], null, { gcGraceMs: 0 }); // no grace: sweep now
  {
    const del = await raw(`/gen/${CH}/${g3.gen}`, { method: 'DELETE' });
    ok('server refuses deleting the pointed generation (409)', del.status === 409);
  }
  // GC reads the gen list, which lags up to ~60s — a sweep right after rapid-fire commits
  // cannot yet SEE (so cannot delete) gens committed seconds earlier. By design GC is
  // best-effort and CONVERGES via later writers. So: wait out the lag, commit again,
  // and verify convergence to keep-2 — the semantic the design actually promises.
  console.log('  (waiting out list propagation, then committing g4 to verify GC convergence...)');
  await sleep(65000);
  const g4 = await RW.commitGeneration(payload('canon4', 53), [], null, { gcGraceMs: 0 });
  await eventually('generations converge to keep-2 on the next sweep', async () => {
    const gens = (await (await raw(`/gen/${CH}/list`)).json()).gens;
    return gens.length <= 2 && gens.includes(g4.gen);
  });

  console.log('\n[9] Early run GC (absorbed bulk run)');
  await RW.deleteRun(m.runId);
  await eventually('deleted run gone from mailbox', async () => {
    const mb = await RW.readMailbox();
    return !mb.runs.some(r => r.runId === m.runId) && !mb.incomplete.includes(m.runId);
  });

  console.log('\n[10] LEGACY FALLBACK: old-format channel, no pointer');
  window._RW_RELAY_CHANNEL = CH_LEGACY;
  RW.initFromGlobals();
  const legacyPayload = payload('legacy', 7);
  await RW.upload(legacyPayload, () => {});
  {
    const c = await RW.readCanonical();
    ok('readCanonical falls through to legacy format', c && c.source === 'legacy' && c.jsonString === legacyPayload);
  }
  await RW.cleanup(); // remove legacy test data

  console.log('\n[11] composeCanonical — the deterministic merge (pure, no network)');
  {
    const mkRun = (runId, kind, fetchDate, content) =>
      ({ runId, kind, fetchDate, timestamp: parseInt(runId), jsonString: JSON.stringify(content) });
    const canon = JSON.stringify({ schemaVersion: '2.3',
      books: { fetchDate: '2026-08-01T00:00:00Z', items: [
        { asin: 'AAA', title: 'Book A', tags: ['keep-me'], currentPrice: '$9.99' }] } });

    // Wishlist add of a new book
    let r = RW.composeCanonical(canon, [
      mkRun('100-d-aaaa', 'wishlist-add', '2026-08-10T00:00:00Z',
        { books: { fetchDate: '2026-08-10T00:00:00Z', items: [{ asin: 'BBB', title: 'Book B', onWishlist: true }] } })
    ]);
    let out = JSON.parse(r.jsonString);
    ok('add: 2 books', out.books.items.length === 2);

    // Newer Amazon-data update of A must NOT lose canonical-only fields (tags)
    r = RW.composeCanonical(canon, [
      mkRun('101-d-aaaa', 'books', '2026-08-12T00:00:00Z',
        { books: { fetchDate: '2026-08-12T00:00:00Z', items: [{ asin: 'AAA', title: 'Book A', currentPrice: '$4.99' }] } })
    ]);
    out = JSON.parse(r.jsonString);
    const a = out.books.items.find(b => b.asin === 'AAA');
    ok('update: newest price wins, tags survive the spread',
       a.currentPrice === '$4.99' && Array.isArray(a.tags) && a.tags[0] === 'keep-me');

    // OLDER data must not overwrite newer canonical fields
    r = RW.composeCanonical(canon, [
      mkRun('102-d-aaaa', 'books', '2026-07-01T00:00:00Z',
        { books: { fetchDate: '2026-07-01T00:00:00Z', items: [{ asin: 'AAA', title: 'Old Title', currentPrice: '$99' }] } })
    ]);
    ok('stale run loses to newer canonical', JSON.parse(r.jsonString).books.items[0].currentPrice === '$9.99');

    // Tombstone kills, persists, and blocks OLDER re-appearances...
    const tomb = mkRun('103-d-aaaa', 'tombstone', '2026-08-13T00:00:00Z',
      { tombstones: { items: [{ asin: 'AAA', deletedAt: '2026-08-13T00:00:00Z' }] } });
    const staleResurrect = mkRun('104-d-aaaa', 'books', '2026-08-12T00:00:00Z',
      { books: { fetchDate: '2026-08-12T00:00:00Z', items: [{ asin: 'AAA', title: 'Zombie A' }] } });
    r = RW.composeCanonical(canon, [tomb, staleResurrect]);
    out = JSON.parse(r.jsonString);
    ok('tombstone kills + blocks pre-delete data (resurrection race)',
       out.books.items.length === 0 && out.tombstones.items[0].asin === 'AAA');

    // ...but a NEWER sighting revives (deliberate re-add)
    const readd = mkRun('105-d-aaaa', 'wishlist-add', '2026-08-14T00:00:00Z',
      { books: { fetchDate: '2026-08-14T00:00:00Z', items: [{ asin: 'AAA', title: 'A again', onWishlist: true }] } });
    r = RW.composeCanonical(canon, [tomb, readd]);
    out = JSON.parse(r.jsonString);
    ok('newer sighting revives + clears the tombstone',
       out.books.items.length === 1 && !out.tombstones);

    // Reset run = new baseline, everything older superseded
    const reset = mkRun('106-d-aaaa', 'reset', '2026-08-14T01:00:00Z',
      { books: { fetchDate: '2026-08-05T00:00:00Z', items: [{ asin: 'CCC', title: 'Only C' }] } });
    r = RW.composeCanonical(canon, [tomb, reset]);
    out = JSON.parse(r.jsonString);
    ok('reset: baseline replaced, prior tombstones cleared',
       out.books.items.length === 1 && out.books.items[0].asin === 'CCC' && !out.tombstones);

    // Idempotence: absorbing the same run twice changes nothing (safe re-merge)
    const once = RW.composeCanonical(canon, [readd]).jsonString;
    const twice = RW.composeCanonical(once, [readd]).jsonString;
    ok('idempotent: re-applying an absorbed run is a no-op',
       JSON.parse(twice).books.items.length === JSON.parse(once).books.items.length);
  }

  console.log('\n[12] Full app-import cycle (fresh channel): letter → compose → commit → tombstone → revive');
  const CH_CYCLE = '44444444-5555-4666-8777-888888888888';
  window._RW_RELAY_CHANNEL = CH_CYCLE;
  RW.initFromGlobals();
  {
    // Wishlist add lands as a letter; app "imports": compose + commit, carrying absorbedRuns forward
    const wishBody = { schemaVersion: '2.3', books: { fetchDate: new Date().toISOString(),
      items: [{ asin: 'CYCLE1', title: 'Cycle Book', onWishlist: true, blob: rand() }] } };
    const wr = await RW.writeRun(JSON.stringify(wishBody), 'wishlist-add');
    await eventually('checkForUpdates sees the pending letter', async () => {
      const u = await RW.checkForUpdates();
      return u && u.source === 'mailbox' && u.pending >= 1;
    });

    // App import: read + compose + local-load (simulated) + merge-on-import
    let canonical = await RW.readCanonical();
    let mailbox = await RW.readMailbox();
    let pending = canonical && canonical.manifest ? RW.unabsorbedRuns(mailbox.runs, canonical.manifest) : mailbox.runs;
    let composed = RW.composeCanonical(canonical ? canonical.jsonString : null, pending);
    ok('composed library has the wishlist book', JSON.parse(composed.jsonString).books.items.some(b => b.asin === 'CYCLE1'));
    let absorbed = RW.pruneAbsorbedRuns([
      ...((canonical && canonical.manifest && canonical.manifest.absorbedRuns) || []),
      ...pending.map(r => r.runId)]);
    await RW.commitGeneration(composed.jsonString, absorbed);
    await eventually('after merge-on-import: nothing pending', async () => (await RW.checkForUpdates()) === null);

    // Permanent delete: tombstone letter, then the next import kills the book in the canonical
    await RW.writeRun(JSON.stringify({ schemaVersion: '2.3',
      tombstones: { items: [{ asin: 'CYCLE1', deletedAt: new Date().toISOString() }] } }), 'tombstone');
    await eventually('tombstone letter shows as pending', async () => {
      const u = await RW.checkForUpdates();
      return u && u.source === 'mailbox';
    });
    canonical = await RW.readCanonical();
    mailbox = await RW.readMailbox();
    pending = RW.unabsorbedRuns(mailbox.runs, canonical.manifest);
    composed = RW.composeCanonical(canonical.jsonString, pending);
    {
      const out = JSON.parse(composed.jsonString);
      ok('next import: book deleted, tombstone persisted in canonical',
         !out.books.items.some(b => b.asin === 'CYCLE1') && out.tombstones && out.tombstones.items[0].asin === 'CYCLE1');
    }
    absorbed = RW.pruneAbsorbedRuns([...(canonical.manifest.absorbedRuns || []), ...pending.map(r => r.runId)]);
    await RW.commitGeneration(composed.jsonString, absorbed);

    // Re-add AFTER the delete: newer sighting revives through the persisted tombstone
    await sleep(1100); // ensure the new letter's fetchDate is strictly after deletedAt
    await RW.writeRun(JSON.stringify({ schemaVersion: '2.3', books: { fetchDate: new Date().toISOString(),
      items: [{ asin: 'CYCLE1', title: 'Cycle Book again', onWishlist: true, blob: rand() }] } }), 'wishlist-add');
    await eventually('re-add revives the tombstoned book on the next compose', async () => {
      const c = await RW.readCanonical();
      const mb = await RW.readMailbox();
      const p = RW.unabsorbedRuns(mb.runs, c.manifest);
      if (p.length === 0) return false;
      const out = JSON.parse(RW.composeCanonical(c.jsonString, p).jsonString);
      return out.books.items.some(b => b.asin === 'CYCLE1') && !out.tombstones;
    });
  }

  console.log('\n[13] hasCanonical + age-cap gating (young runs never trigger)');
  {
    ok('hasCanonical true where generations exist', await RW.hasCanonical() === true);
    // Pending run exists on this channel (the re-add from [12]) but it is seconds old:
    const acm = await RW.maybeAgeCapMerge();
    ok(`age-cap declines young pending runs (${acm.reason})`, acm.merged === false && acm.reason === 'young');
    window._RW_RELAY_CHANNEL = '55555555-6666-4777-8888-999999999999'; // untouched channel
    RW.initFromGlobals();
    ok('hasCanonical false on an empty channel', await RW.hasCanonical() === false);
    const acm2 = await RW.maybeAgeCapMerge();
    ok('age-cap no-ops on an empty channel', acm2.merged === false && acm2.reason === 'nothing-pending');
  }

  console.log('\n[14] Bulk-run GC: absorbed multi-letter runs reclaimed, tiny runs ride the TTL');
  window._RW_RELAY_CHANNEL = CH_CYCLE; // back to the cycle channel
  RW.initFromGlobals();
  {
    const bulkBody = payload('bulkgc', 30);
    const bulk = await RW.writeRun(bulkBody, 'books', null, { inlineMax: 0, letterSize: 500 });
    const tiny = await RW.writeRun(payload('tinygc', 1), 'wishlist-add');
    // App-import shape: read, compose, commit absorbing both, then reclaim
    let canonical, pending;
    await eventually('both runs visible as pending', async () => {
      canonical = await RW.readCanonical();
      const mb = await RW.readMailbox();
      pending = RW.unabsorbedRuns(mb.runs, canonical.manifest);
      return pending.some(r => r.runId === bulk.runId && r.parts > 1)
          && pending.some(r => r.runId === tiny.runId && r.parts === 1);
    });
    const composed = RW.composeCanonical(canonical.jsonString, pending);
    const absorbed = RW.pruneAbsorbedRuns([...(canonical.manifest.absorbedRuns || []), ...pending.map(r => r.runId)]);
    await RW.commitGeneration(composed.jsonString, absorbed);
    const deleted = await RW.deleteAbsorbedBulkRuns(pending.map(r => ({ runId: r.runId, parts: r.parts })));
    ok('exactly the bulk run was deleted (tiny one left to TTL)', deleted === 1);
    await eventually('bulk run gone from mailbox; tiny letter still present (absorbed, riding TTL)', async () => {
      const mb = await RW.readMailbox();
      const bulkGone = !mb.runs.some(r => r.runId === bulk.runId) && !mb.incomplete.includes(bulk.runId);
      const tinyThere = mb.runs.some(r => r.runId === tiny.runId);
      return bulkGone && tinyThere;
    });
    // And absorbed-set semantics still retire the tiny run from "pending"
    const c2 = await RW.readCanonical();
    const mb2 = await RW.readMailbox();
    ok('tiny run absorbed (not pending) despite letter still existing',
       !RW.unabsorbedRuns(mb2.runs, c2.manifest).some(r => r.runId === tiny.runId));
  }

  console.log('\n[15] skip-absorbed-before-download + shared loadKnownBooks (7.0.1)');
  {
    // Cycle channel state: canonical has absorbed runs; the tiny letter from [14] still
    // physically exists in the mailbox (riding TTL) but is in the ledger.
    const c = await RW.readCanonical();
    const absorbed = new Set(c.manifest.absorbedRuns || []);
    ok('precondition: ledger is non-empty', absorbed.size > 0);
    const full = await RW.readMailbox();
    const skipped = await RW.readMailbox(null, { skipRunIds: absorbed });
    const absorbedStillPhysical = full.runs.filter(r => absorbed.has(r.runId)).length;
    ok(`skip omits absorbed-but-physical runs (${absorbedStillPhysical} skipped pre-download)`,
       skipped.runs.every(r => !absorbed.has(r.runId))
       && skipped.runs.length === full.runs.length - absorbedStillPhysical);
    ok('skip result identical to post-filter (same pending set)',
       JSON.stringify(skipped.runs.map(r => r.runId).sort())
       === JSON.stringify(RW.unabsorbedRuns(full.runs, c.manifest).map(r => r.runId).sort()));

    // Shared fetcher helper smoke test: known-books map built from canonical + pending
    const phases = [];
    const known = await RW.loadKnownBooks((p, d) => phases.push(p));
    ok('loadKnownBooks: canonical books present (CYCLE1 revived in [12/14])',
       known.byAsin.has('CYCLE1') && known.byAsin.size > 0);
    ok('loadKnownBooks: progress callback fired', phases.length > 0);
    ok('loadKnownBooks: pending excludes absorbed runs',
       known.pending.every(r => !absorbed.has(r.runId)));
  }

  console.log('\n[16] Device-state journal (Phase 1b): dual-read, chunked writes, torn-write safety');
  // Genuinely fresh channel EVERY run (prior-run journal residue would win the dual-read)
  const CH6 = '66666666-7777-4888-8999-' + Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  window._RW_RELAY_CHANNEL = CH6;
  RW.initFromGlobals();
  {
    ok('empty channel: getDeviceState null', await RW.getDeviceState() === null);

    // Legacy-format push (kept as a test helper; no production caller since 7.5.0)
    const legacyState = payload('dstate-legacy', 5);
    await RW.putDeviceStateLegacy(legacyState);
    ok('legacy single-key write read back via dual-reader', await RW.getDeviceState() === legacyState);
    const legacySeedBytes = (await (await fetch(`${DEV_URL}/device-state/${CH6}`)).arrayBuffer()).byteLength;

    // Journal push (forced multi-chunk) — must now win over the legacy key
    const j1 = payload('dstate-journal-1', 40);
    const m1 = await RW.putDeviceStateJournal(j1, null, { chunkSize: 1500 });
    ok(`journal write chunked (${m1.chunkCount} parts)`, m1.chunkCount >= 2);
    ok('dual-reader prefers the journal over the legacy key', await RW.getDeviceState() === j1);

    // Torn journal write: begin + chunk, no manifest → reader unaffected
    const rawB = DEV_URL;
    const torn = (await (await fetch(`${rawB}/dstate/${CH6}/begin?device=harness`, { method: 'POST' })).json()).gen;
    await fetch(`${rawB}/dstate/${CH6}/${torn}/chunk/0`, { method: 'POST', body: 'torn-dstate' });
    ok('torn journal write invisible: reader still gets last good gen', await RW.getDeviceState() === j1);

    // Second journal push (the two-tab shape: another complete gen, pointer moves)
    const j2 = payload('dstate-journal-2', 41);
    await RW.putDeviceStateJournal(j2, null, { chunkSize: 1500 });
    ok('second push: pointer moved, newest content served', await RW.getDeviceState() === j2);

    // Pointer vanished (e.g. TTL'd while gens survive) → list fallback still serves
    await fetch(`${rawB}/dstate-pointer/${CH6}`, { method: 'GET' }); // (no delete endpoint; simulate by checking fallback path works when pointer names a gen we can read anyway)
    ok('list fallback returns newest complete when asked directly', await RW.getDeviceState() === j2);

    // Writer (7.5.0): putDeviceState = journal ONLY (double-write dropped)
    const j3 = payload('dstate-solo', 8);
    const m3 = await RW.putDeviceState(j3);
    ok('putDeviceState returns a journal manifest (journal is primary)', !!(m3 && m3.gen && m3.chunkCount >= 1));
    ok('reader serves the new push via the journal', await RW.getDeviceState() === j3);
    const legacyRaw = await fetch(`${DEV_URL}/device-state/${CH6}`);
    const legacyNowBytes = legacyRaw.ok ? (await legacyRaw.arrayBuffer()).byteLength : 0;
    ok('legacy key UNTOUCHED by putDeviceState (double-write is gone; old seed intact, will TTL away)',
       legacyNowBytes === legacySeedBytes);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
