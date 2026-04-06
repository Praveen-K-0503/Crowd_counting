# Priority Scoring

## Goal

Define a simple but effective priority model so complaints are ordered correctly inside each department queue and emergency incidents receive immediate attention.

## Priority levels

### P1 Critical

Immediate public safety or disaster risk. Requires urgent response.

### P2 High

Serious issue with strong public impact or high service disruption. Requires fast action.

### P3 Medium

Important issue that affects quality of life but does not usually create immediate danger.

### P4 Low

Minor issue with lower urgency and limited public impact.

## Priority factors

Priority should be determined using a weighted combination of:

1. Domain type
2. Sub-problem type
3. Emergency flag
4. Severity estimate
5. Location sensitivity
6. Repeat complaint volume
7. Complaint age
8. SLA breach risk
9. Visibility and population impact

## Base scoring idea

Each complaint can start with a base score and then gain additional points.

### Base by category

- Emergency domain: +60
- High-risk sub-problem: +35
- Standard civic issue: +20

### Severity modifiers

- Severe visible damage: +25
- Moderate damage: +15
- Minor damage: +5

### Location sensitivity modifiers

- Near hospital, school, major junction, market, or highway: +20
- Dense residential zone: +10
- Low-traffic zone: +0 to +5

### Repeat complaint modifiers

- 5 or more nearby similar complaints: +20
- 2 to 4 nearby similar complaints: +10
- 1 complaint only: +0

### Time and SLA modifiers

- SLA breached: +20
- Near SLA breach: +10
- Long pending even at lower priority: +5 to +10

## Suggested score to level mapping

- 80 and above -> `P1 Critical`
- 55 to 79 -> `P2 High`
- 30 to 54 -> `P3 Medium`
- Below 30 -> `P4 Low`

## Domain examples

### Roads and Transportation

- Large pothole on highway -> `P2`
- Road cave-in near hospital -> `P1`
- Minor footpath crack -> `P4`
- Road blockage affecting traffic -> `P2` or `P1` depending on severity

### Sanitation and Waste Management

- Overflowing garbage bin in market -> `P3`
- Waste pile causing health hazard -> `P2`
- Routine missed pickup in low-density area -> `P4`

### Water Supply, Sewerage, and Drainage

- Major sewage overflow in residential area -> `P2`
- Waterlogging during heavy rain affecting roads -> `P2`
- Flooded underpass or dangerous overflow -> `P1`
- Minor leak complaint -> `P3`

### Street Lighting and Electrical Infrastructure

- Broken streetlight on local lane -> `P3`
- Exposed live wire on public road -> `P1`
- Damaged pole with risk of falling -> `P2`
- Transformer issue affecting locality -> `P2`

### Public Infrastructure and Amenities

- Open manhole in busy road -> `P1`
- Damaged public toilet -> `P3`
- Broken park bench -> `P4`
- Damaged bus stop in high-traffic area -> `P3`

### Environment and Public Health

- Mosquito breeding near school -> `P2`
- Fallen tree blocking road -> `P2` or `P1`
- Dead animal in public area -> `P3`
- Smoke pollution complaint -> `P3`

## Emergency domain examples

- Fire outbreak -> `P1`
- Flood in residential zone -> `P1`
- Building collapse risk -> `P1`
- Live electrical hazard -> `P1`
- Rescue-needed event -> `P1`

## Department queue ordering

If multiple domains map to the same department, queue order should be:

1. Higher priority level first
2. Higher severity score next
3. Higher public impact next
4. Older complaints next
5. Reopened complaints next

This prevents minor issues from blocking dangerous or repeated complaints.

## Override rules

The system should allow manual override by authorized roles when:

- the AI or rule score is clearly wrong
- field conditions show more severe impact
- an issue becomes politically or operationally urgent
- a citizen reopens the complaint with stronger evidence

Only department heads, municipal admins, or emergency leads should override priority.

## Emergency fast rules

The following should always default to `P1` unless clearly invalid:

- Fire
- Flood
- Building collapse
- Live wire
- Structural collapse hazard
- Rescue request
- Road cave-in with danger to public

## Priority and lifecycle interaction

- Priority is assigned after classification
- Priority may increase automatically when SLA is breached
- Reopened complaints should gain a priority boost
- Escalated complaints should not return to lower priority automatically

## Suggested MVP rule engine

For version 1, use a simple rule-based system:

- Emergency domain -> `P1`
- Hazard-related sub-problem -> `P1` or `P2`
- Main public disruption issue -> `P2`
- Routine civic issue -> `P3`
- Minor amenity issue -> `P4`

Add these modifiers:

- near hospital or school -> raise one level
- repeated complaint cluster -> raise one level
- reopened complaint -> raise one level
- SLA breached -> raise one level

Cap at `P1`.

## Future AI enhancement

Later, improve scoring using:

- image severity estimation
- text urgency detection
- hotspot analysis
- historical response data
- predictive escalation risk

## Notes

- Start with rules first.
- Keep scoring explainable to admins.
- Store both the final priority level and the raw reasons behind it.
