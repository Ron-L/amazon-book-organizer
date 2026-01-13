"""
Dev Tasks Service for ReaderWrangler
1. Updates .claude-timestamp file every 60 seconds with current local time
2. Syncs latest backup to configured cloud folder (optional)

Run this in the background: python dev-tasks.py
Configure backup sync in dev-tasks.cfg (see dev-tasks.cfg.example)
"""
import time
import os
import glob
import shutil
import configparser

VERSION = "1.0.0"

# Load configuration
config = configparser.ConfigParser()
config.read('dev-tasks.cfg')

# Backup sync settings (from config file, with defaults)
BACKUP_SYNC_PATH = config.get('backup_sync', 'path', fallback='').strip()
BACKUP_KEEP_COUNT = config.getint('backup_sync', 'keep_count', fallback=1)

print(f"Dev Tasks Service for ReaderWrangler v{VERSION}")
print("-" * 50)
print("Tasks:")
print("  - Update .claude-timestamp every 60 seconds")
if BACKUP_SYNC_PATH:
    print(f"  - Sync backups to: {BACKUP_SYNC_PATH}")
    print(f"  - Keep {BACKUP_KEEP_COUNT} backup(s) in sync folder")
else:
    print("  - Backup sync: disabled (no path configured)")
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

# Main loop
while True:
    lastTime = time.time()

    # Task 1: Update timestamp
    timestamp_str = update_timestamp()
    print(f"[{timestamp_str}] Timestamp updated", end="")

    # Task 2: Sync backups (if configured)
    synced = sync_backups()
    if synced:
        print(f" | Backup synced")
    else:
        print()

    # Sleep until exactly 60 seconds from lastTime
    # This accounts for work duration and ensures precise 60-second intervals
    elapsed = time.time() - lastTime
    time.sleep(max(0, 60 - elapsed))
