# Restore safeguard — the informed confirm

**Status:** Implemented in 7.4.0 (2026-08-28). Supersedes the 2026-08-03 keep/merge sketch — see "The rejected design" below.
**Origin:** Book Lists "vanished" on a restore, 2026-07-02.

---

## The principle

**Restore is a pure time machine.** It takes the library and organization back *exactly* as they
were at the backup's moment — no merging, no keeping interim work. What the incident of 7/02
actually needed was not a merge feature but **informed consent**: the old dialog never said what
the machine was about to do.

## The design (shipped)

Before any restore onto a non-empty system, a dialog shows:

1. **The backup's date, prominently, with its age** ("This backup is from June 20 — 5 weeks ago").
   Most restore surprises are really *backup-age* surprises.
2. **Exactly what restoring removes**: current Book Lists and Searches that are absent from the
   backup, **by name** (first 5 + "and N more"). Computed by id-diff at confirm time. If nothing
   would be lost, the dialog says that too ("✓ All of your current Book Lists and Searches are in
   this backup").
3. **Three actions:** **Back up current first…** (runs Save Backup and returns to the dialog —
   after which the restore is fully reversible) · **Cancel** · **Restore**.

The safety hatch is **capturing the present**, not merging the past. An empty system (post-reset,
first run) restores directly with no dialog — nothing to lose.

7.0 synergy: the restore still pushes a **reset run** to the relay afterward, so the confirmed
result becomes the baseline everywhere, mobile included.

## The rejected design: per-category keep/merge

The 2026-08-03 sketch offered per-category (Book Lists / Searches) keep/discard on restore.
**Rejected 2026-08-28** for these reasons:

- **It breaks the one operation users can predict perfectly.** "Exactly as it was on ‹date›" is
  a complete mental model; merge makes restore's outcome unpredictable.
- **Merge anomalies are the *normal* result of interim work, not edge cases.** A book moved from
  list A to new list B since the backup ends up in *both*. A list deliberately *deleted* after
  the backup comes back (merge keeps additions but resurrects deletions — an asymmetry no dialog
  can explain). Kept lists can reference books that aren't in the backup; kept Searches can
  reference tags the restore removed.
- **The niche is nichier than it looks.** Real restore triggers: disaster recovery (nothing to
  merge), machine migration (nothing to merge), deliberate rollback (merge is the anti-goal).
- **"Back up current first" dominates merge in every way** — loses nothing, keeps semantics pure,
  and makes the restore reversible.
- **Origin archaeology:** the 7/02 incident was most likely *correct* time-machine behavior
  misread as data loss (the "lost" lists postdated the backup). The fix it needed was the date
  and the names on the dialog.

The old sketch's third bullet (append unknown books to the end of manual sort order) dissolves
with the merge; existing orphan-preservation + Inbox placement handle stray books predictably.
