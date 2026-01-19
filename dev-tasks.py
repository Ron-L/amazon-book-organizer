"""
Dev Tasks Service for ReaderWrangler
1. Updates .claude-timestamp file every 60 seconds with current local time
2. Syncs latest backup to configured cloud folder (optional)
3. Syncs configured directories to backup locations (optional)

Run this in the background: python dev-tasks.py
Configure in dev-tasks.cfg (see dev-tasks.cfg.example)
"""
import time
import os
import glob
import shutil
import configparser

VERSION = "1.1.0"

# Load configuration
config = configparser.ConfigParser()
config.read('dev-tasks.cfg')

# Backup sync settings (from config file, with defaults)
BACKUP_SYNC_PATH = config.get('backup_sync', 'path', fallback='').strip()
BACKUP_KEEP_COUNT = config.getint('backup_sync', 'keep_count', fallback=1)

# Directory sync settings (from config file)
# Format: source_path = dest_path (one per line)
# Both paths can be relative (resolved against script directory)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIR_SYNC_MAPPINGS = []
if config.has_section('dir_sync'):
    for src, dest in config.items('dir_sync'):
        src = src.strip()
        dest = dest.strip()
        # Resolve relative paths against script directory
        if src and not os.path.isabs(src):
            src = os.path.join(SCRIPT_DIR, src)
        if dest and not os.path.isabs(dest):
            dest = os.path.join(SCRIPT_DIR, dest)
        if src and dest and os.path.isdir(src):
            DIR_SYNC_MAPPINGS.append((src, dest))

print(f"Dev Tasks Service for ReaderWrangler v{VERSION}")
print("-" * 50)
print("Tasks:")
print("  - Update .claude-timestamp every 60 seconds")
if BACKUP_SYNC_PATH:
    print(f"  - Sync backups to: {BACKUP_SYNC_PATH}")
    print(f"  - Keep {BACKUP_KEEP_COUNT} backup(s) in sync folder")
else:
    print("  - Backup sync: disabled (no path configured)")
if DIR_SYNC_MAPPINGS:
    print(f"  - Directory sync: {len(DIR_SYNC_MAPPINGS)} mapping(s)")
    for src, dest in DIR_SYNC_MAPPINGS:
        print(f"      {src} -> {dest}")
else:
    print("  - Directory sync: disabled (no mappings configured)")
print("-" * 50)
print("Press Ctrl+C to stop")
print()

def update_timestamp():
    """Write current local time to .claude-timestamp"""
    timestamp_str = time.strftime('%Y-%m-%d %H:%M:%S')
    with open('.claude-timestamp', 'w') as f:
        f.write(timestamp_str)
    return timestamp_str

def sync_backups():
    """Copy latest backup to sync folder, cleanup old backups"""
    if not BACKUP_SYNC_PATH:
        return None

    # Find all backups in current directory
    local_backups = glob.glob('readerwrangler-backup-*.json')
    if not local_backups:
        return None

    # Get most recent local backup (by modification time)
    latest_local = max(local_backups, key=os.path.getmtime)
    latest_local_mtime = os.path.getmtime(latest_local)

    # Check if sync folder exists, create if not
    if not os.path.exists(BACKUP_SYNC_PATH):
        os.makedirs(BACKUP_SYNC_PATH)

    # Find backups in sync folder
    sync_pattern = os.path.join(BACKUP_SYNC_PATH, 'readerwrangler-backup-*.json')
    sync_backups = glob.glob(sync_pattern)

    # Check if we need to copy (latest local is newer than newest in sync folder)
    need_copy = True
    if sync_backups:
        latest_sync = max(sync_backups, key=os.path.getmtime)
        latest_sync_mtime = os.path.getmtime(latest_sync)
        # Only copy if local is newer
        if latest_local_mtime <= latest_sync_mtime:
            need_copy = False

    if need_copy:
        # Copy latest backup to sync folder
        dest_path = os.path.join(BACKUP_SYNC_PATH, os.path.basename(latest_local))
        shutil.copy2(latest_local, dest_path)
        print(f"  Synced: {os.path.basename(latest_local)} -> {BACKUP_SYNC_PATH}")

        # Refresh list of sync backups after copy
        sync_backups = glob.glob(sync_pattern)

        # Cleanup: keep only BACKUP_KEEP_COUNT most recent
        if len(sync_backups) > BACKUP_KEEP_COUNT:
            # Sort by modification time, oldest first
            sync_backups.sort(key=os.path.getmtime)
            # Delete oldest ones
            to_delete = sync_backups[:-BACKUP_KEEP_COUNT]
            for old_backup in to_delete:
                os.remove(old_backup)
                print(f"  Cleaned: {os.path.basename(old_backup)}")

        return os.path.basename(latest_local)

    return None

def get_newest_mtime(directory):
    """Get the most recent modification time of any file in directory (recursive)"""
    newest = 0
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f == '.last-sync':  # Skip our own marker file
                continue
            filepath = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(filepath)
                if mtime > newest:
                    newest = mtime
            except OSError:
                pass
    return newest

def sync_directory(src_path, dest_path):
    """
    Sync source directory to destination.
    Uses .last-sync file in dest for fast "nothing changed" detection.
    Returns tuple: (files_copied, files_deleted)
    """
    last_sync_file = os.path.join(dest_path, '.last-sync')

    # Create dest if it doesn't exist
    if not os.path.exists(dest_path):
        os.makedirs(dest_path)

    # Fast path: check if anything in source is newer than last sync
    last_sync_time = 0
    if os.path.exists(last_sync_file):
        last_sync_time = os.path.getmtime(last_sync_file)

    newest_src_time = get_newest_mtime(src_path)
    if newest_src_time <= last_sync_time:
        return (0, 0)  # Nothing changed

    # Something changed - do incremental sync
    files_copied = 0
    files_deleted = 0

    # Build set of all relative paths in source
    src_files = set()
    for root, dirs, files in os.walk(src_path):
        for f in files:
            src_full = os.path.join(root, f)
            rel_path = os.path.relpath(src_full, src_path)
            src_files.add(rel_path)

            dest_full = os.path.join(dest_path, rel_path)
            dest_dir = os.path.dirname(dest_full)

            # Check if we need to copy
            need_copy = False
            if not os.path.exists(dest_full):
                need_copy = True
            else:
                # Copy if source is newer
                src_mtime = os.path.getmtime(src_full)
                dest_mtime = os.path.getmtime(dest_full)
                if src_mtime > dest_mtime:
                    need_copy = True

            if need_copy:
                if not os.path.exists(dest_dir):
                    os.makedirs(dest_dir)
                shutil.copy2(src_full, dest_full)
                files_copied += 1

    # Delete files in dest that no longer exist in source
    for root, dirs, files in os.walk(dest_path):
        for f in files:
            if f == '.last-sync':
                continue
            dest_full = os.path.join(root, f)
            rel_path = os.path.relpath(dest_full, dest_path)
            if rel_path not in src_files:
                os.remove(dest_full)
                files_deleted += 1

    # Clean up empty directories in dest
    for root, dirs, files in os.walk(dest_path, topdown=False):
        for d in dirs:
            dir_path = os.path.join(root, d)
            try:
                if not os.listdir(dir_path):
                    os.rmdir(dir_path)
            except OSError:
                pass

    # Update last sync marker
    with open(last_sync_file, 'w') as f:
        f.write(time.strftime('%Y-%m-%d %H:%M:%S'))

    return (files_copied, files_deleted)

def sync_directories():
    """Sync all configured directory mappings. Returns summary string or None."""
    if not DIR_SYNC_MAPPINGS:
        return None

    total_copied = 0
    total_deleted = 0

    for src, dest in DIR_SYNC_MAPPINGS:
        copied, deleted = sync_directory(src, dest)
        total_copied += copied
        total_deleted += deleted

    if total_copied > 0 or total_deleted > 0:
        parts = []
        if total_copied > 0:
            parts.append(f"{total_copied} copied")
        if total_deleted > 0:
            parts.append(f"{total_deleted} deleted")
        return ", ".join(parts)

    return None

# Main loop
while True:
    lastTime = time.time()

    # Task 1: Update timestamp
    timestamp_str = update_timestamp()
    status_parts = []

    # Task 2: Sync backups (if configured)
    synced = sync_backups()
    if synced:
        status_parts.append("backup synced")

    # Task 3: Sync directories (if configured)
    dir_sync_result = sync_directories()
    if dir_sync_result:
        status_parts.append(f"dir sync: {dir_sync_result}")

    # Print status
    if status_parts:
        print(f"[{timestamp_str}] Timestamp updated | {' | '.join(status_parts)}")
    else:
        print(f"[{timestamp_str}] Timestamp updated")

    # Sleep until exactly 60 seconds from lastTime
    # This accounts for work duration and ensures precise 60-second intervals
    elapsed = time.time() - lastTime
    time.sleep(max(0, 60 - elapsed))
