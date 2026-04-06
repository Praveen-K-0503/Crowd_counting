# CivicPulse Operations Runbook

## Daily Checks

- Confirm frontend is reachable
- Confirm backend health endpoint returns `status: ok`
- Review urgent queue count
- Review unread operator notifications
- Review analytics page for SLA risk and reopen spikes

## Incident Triage

### If complaint creation fails

- Check backend health
- Confirm database connectivity
- Confirm upload directory permissions
- Review request validation errors in backend logs

### If dashboard numbers look stale

- Confirm backend process is current
- Check cache expiry behavior
- Restart backend if a deployment happened mid-session

### If field officers cannot complete work

- Confirm at least one resolution proof upload exists
- Confirm assignment belongs to that officer
- Confirm complaint has not been closed already

### If citizens do not see updates

- Check complaint status history records
- Check notifications table for the user
- Confirm complaint belongs to the logged-in citizen

## Smoke Test

Run:

```powershell
cd "C:\Users\Praveen\Documents\New project\civic-platform\backend"
npm run smoke
```

Expected checks:

- health
- departments lookup
- domains lookup
- dashboard summary
- analytics summary
- analytics CSV export

## Recovery Actions

- Restart backend service
- Re-run `npm run smoke`
- Verify `/api/health`
- Verify complaint queue and analytics page
