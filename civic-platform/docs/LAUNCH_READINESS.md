# CivicPulse Launch Readiness

This checklist covers the production-readiness baseline for CivicPulse as a public, real-time civic operations platform.

## Platform Baseline

- Frontend production build passes
- Backend production build passes
- Database schema and seed scripts run cleanly
- Performance indexes are applied from [003_performance_indexes.sql](/C:/Users/Praveen/Documents/New%20project/civic-platform/backend/sql/003_performance_indexes.sql)
- Health endpoint reports database connectivity
- Smoke checks pass for health, lookup APIs, dashboard analytics, and CSV export

## Security Baseline

- CORS origins are restricted through backend environment configuration
- Request rate limiting is enabled
- Input sanitization is applied to citizen and operator text inputs
- Role-safe access is enforced for complaint creation, assignment, updates, notes, proof uploads, and verification
- Session cookies are used for authenticated web access
- Secrets stay in environment files, not source control

## Performance Baseline

- Cache dashboard and analytics summaries to reduce repeated heavy queries
- Keep complaint timelines, notifications, and queue queries indexed
- Use direct media upload flow with retry support
- Keep map datasets filtered and paginated where possible
- Push expensive AI work off the main request path when external models are introduced

## Monitoring Baseline

- Use the backend health endpoint as the first readiness signal
- Track complaint creation, assignment, status changes, resolution proof, verification, and reopen actions through audit logs
- Add external error tracking before public launch
- Add uptime monitoring for:
  - frontend URL
  - backend health URL
  - database availability

## Operational Checklist

- Test citizen flow:
  - login
  - report complaint
  - upload media
  - track complaint
  - verify or reopen
- Test operator flow:
  - view queue
  - assign department and field officer
  - update lifecycle state
  - review analytics
- Test field officer flow:
  - accept task
  - start work
  - upload proof
  - complete assignment
- Test notifications and timeline updates after every key step

## Backup and Recovery

- Enable scheduled PostgreSQL backups
- Retain uploaded evidence in persistent object storage for production
- Document restore steps for:
  - database restore
  - media restore
  - environment variable recovery

## Recommended Pre-Launch Commands

Backend:

```powershell
cd "C:\Users\Praveen\Documents\New project\civic-platform\backend"
npm run build
npm run db:init
npm run db:seed
npm run smoke
```

Frontend:

```powershell
cd "C:\Users\Praveen\Documents\New project\civic-platform"
npm run build
```

## Pilot Rollout Recommendation

- Start with one city or one municipal zone
- Limit access to trained operators and field officers first
- Monitor queue throughput, reopen rate, and median resolution time
- Collect citizen usability feedback before wider rollout
