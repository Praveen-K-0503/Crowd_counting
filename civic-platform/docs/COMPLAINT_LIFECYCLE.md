# Complaint Lifecycle

## Goal

Define the official complaint states, their meaning, who can move a complaint between states, and how the lifecycle should behave for both normal civic issues and emergency incidents.

## Core lifecycle states

1. Draft
2. Submitted
3. Validated
4. Classified
5. Prioritized
6. Assigned
7. Accepted
8. In Progress
9. Resolved
10. Citizen Verified
11. Closed

## Additional states

- Escalated
- Reopened
- Duplicate
- Rejected
- On Hold

## State meanings

### Draft

Complaint is being prepared by the citizen but has not been submitted.

### Submitted

Complaint has been submitted with media, description, and location.

### Validated

The complaint has been checked for completeness, spam, and obvious invalid data.

### Classified

The complaint has been assigned to a domain and sub-problem by manual or AI-assisted logic.

### Prioritized

The platform has assigned urgency using severity, location sensitivity, repeat volume, and emergency status.

### Assigned

The complaint has been sent to the correct department or response unit.

### Accepted

The department or assigned operator has acknowledged responsibility for the complaint.

### In Progress

The issue is actively being worked on by the responsible team or officer.

### Resolved

The department reports the issue as fixed and uploads proof if needed.

### Citizen Verified

The citizen confirms the issue has actually been resolved.

### Closed

The complaint is complete and archived as a finished case.

## Special states

### Escalated

The complaint requires higher attention because of urgency, SLA breach, failed resolution, or operational blockage.

### Reopened

The citizen or department indicates the issue still exists after resolution.

### Duplicate

The complaint is linked to an already existing complaint for the same issue and location.

### Rejected

The complaint is not actionable because it is invalid, abusive, outside jurisdiction, or unsupported.

### On Hold

The complaint is temporarily paused because external conditions prevent work, such as weather, access, or dependency on another department.

## Standard lifecycle flow

Draft -> Submitted -> Validated -> Classified -> Prioritized -> Assigned -> Accepted -> In Progress -> Resolved -> Citizen Verified -> Closed

## Common alternate flows

### Duplicate complaint

Submitted -> Validated -> Duplicate

### Invalid complaint

Submitted -> Validated -> Rejected

### Escalated issue

Assigned -> Escalated -> Accepted -> In Progress -> Resolved

### Failed resolution

Resolved -> Reopened -> Assigned -> In Progress -> Resolved

### Temporary blockage

In Progress -> On Hold -> In Progress

## Who can change what

### Citizen

- Create `Draft`
- Submit complaint into `Submitted`
- Request `Reopened`
- Submit closure feedback that can lead to `Citizen Verified`

Citizen cannot directly move complaints into internal processing states.

### Department Operator

- `Submitted` -> `Validated`
- `Validated` -> `Classified`
- `Classified` -> `Prioritized`
- `Prioritized` -> `Assigned`
- `Assigned` -> `Accepted`
- `Accepted` -> `In Progress`
- `Resolved` -> `Closed` if citizen verification is not required by policy
- Set `Duplicate`, `Rejected`, or `On Hold`

### Field Officer

- `Accepted` -> `In Progress`
- Upload work evidence
- Mark work ready for `Resolved`

Field officers should not directly finalize permanent closure unless allowed by department workflow.

### Department Head or Municipal Admin

- Override priority
- Approve `Escalated`
- Reassign from `Assigned`
- Move `On Hold` back to active flow
- Force close only when policy allows

### Emergency Responder

- Fast-track `Assigned` -> `Accepted` -> `In Progress`
- Mark emergency response completion
- Trigger `Escalated` for multi-agency action

## Verification rules

- `Resolved` does not always mean the complaint is finally complete.
- `Closed` is the final state.
- If the product includes citizen confirmation, use `Citizen Verified` before `Closed`.
- If no citizen response is received after a configured time, the system may auto-close after review.

## SLA logic

Each complaint should have:

- creation timestamp
- current state timestamp
- assignment timestamp
- due timestamp
- resolution timestamp
- closure timestamp

The system should track:

- time to validate
- time to assign
- time to first response
- time to resolve
- time to close
- reopen count

## Emergency handling

Emergency complaints should:

- skip non-essential review delay
- receive default high priority
- route immediately to emergency units
- trigger stronger notifications
- appear in a separate emergency queue

Suggested emergency fast path:

Submitted -> Classified -> Prioritized -> Assigned -> In Progress -> Resolved -> Closed

## Audit requirements

Every status change should store:

- complaint ID
- previous status
- new status
- changed by user ID
- changed at timestamp
- reason or note

This is required for transparency and accountability.

## Notification triggers

Send notifications when:

- complaint submitted
- complaint assigned
- complaint escalated
- complaint moved to in progress
- complaint resolved
- citizen verification requested
- complaint reopened
- complaint closed

## MVP lifecycle scope

For version 1, implement:

- Submitted
- Validated
- Classified
- Prioritized
- Assigned
- In Progress
- Resolved
- Reopened
- Closed
- Rejected
- Duplicate

Add later:

- Accepted
- Citizen Verified
- On Hold
- advanced forced closure rules

## Notes

- Keep the lifecycle visible to citizens in simple language.
- Keep internal state transitions strict for staff.
- Do not mix `Resolved` and `Closed`; that causes confusion.
