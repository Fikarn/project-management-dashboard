# Operations

## Expected Runtime Behavior

### Startup

- Electron starts the local Next.js server
- Splash remains visible until `/api/health` returns ready
- The main console then loads from `http://localhost:3000`

### Shutdown

- The app attempts a DMX blackout before quitting
- The local server is then stopped
- On macOS, closing the main window does not quit the app
- On Windows, closing the main window hides it to tray

### Sleep / wake

- On suspend, the app attempts to blackout lights
- On resume, it re-posts lighting settings after a short delay to reinitialize DMX

## Operator Recovery

### Lights stop responding

1. Open the Lighting workspace.
2. Check DMX status in the shell/header and toolbar.
3. Open Lighting settings and verify bridge IP and universe.
4. If the machine just woke from sleep, wait a few seconds for automatic reinit.
5. If still down, restart the app.

### Audio stops responding

1. Open the Audio workspace.
2. Check OSC status in the shell/header.
3. Verify host and port configuration.
4. If TotalMix was restarted, reopen the Audio workspace or restart the app.

### Planning data looks wrong or missing

1. Export a backup immediately if the app is still responsive.
2. Use restore with the latest known-good backup.
3. Check the health endpoint for backup failure count if debugging.

## Data Safety

- Primary store: local JSON database
- Automatic backups: every 30 minutes
- Restore path: `/api/backup/restore`
- Corruption recovery: the database attempts restore from the newest valid backup on startup

## Health Signals

### `/api/health`

- `status`
- `checks.db.ok`
- `checks.backup.ok`
- `checks.backup.lastBackup`
- `checks.backup.failureCount`

### Shell indicators

- Live sync status
- DMX readiness
- OSC readiness
- recent save confirmation

## Recommended Local Checks Before A Live Session

1. Launch the app and verify the main console loads cleanly.
2. Confirm DMX and OSC indicators reflect the expected state.
3. Trigger a test light change.
4. Recall an audio snapshot if audio is in use.
5. Export a manual backup before the session starts.
