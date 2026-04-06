# Domain Routing Map

## Goal

Map each main domain and common sub-problems to the most suitable government department or response unit so routing rules can be implemented consistently.

## Routing principles

- A complaint should route by domain, sub-problem, and location.
- The same domain can map to different departments depending on city structure.
- Emergency complaints should override standard department queues when needed.
- Routing must support ward and jurisdiction level adjustments later.

## Main daily-use domains

### 1. Roads and Transportation

**Primary department**

- Roads and Public Works Department

**Possible supporting departments**

- Traffic Police
- Urban Development Engineering Wing

**Common sub-problems**

- Potholes
- Damaged roads
- Broken footpaths
- Missing road signs
- Damaged dividers
- Traffic signal issues
- Road blockage

**Typical routing**

- Potholes -> Public Works
- Broken footpath -> Public Works
- Missing signboard -> Roads or traffic engineering
- Traffic signal issue -> Traffic or electrical traffic unit
- Road blockage -> Roads department or emergency operations if severe

### 2. Sanitation and Waste Management

**Primary department**

- Sanitation Department

**Possible supporting departments**

- Solid Waste Management Unit
- Health Department

**Common sub-problems**

- Overflowing garbage bins
- Uncleared waste
- Illegal dumping
- Missed garbage collection
- Dirty market or public area
- Waste burning

**Typical routing**

- Overflowing garbage -> Sanitation
- Missed garbage pickup -> Waste collection unit
- Illegal dumping -> Sanitation with enforcement support
- Waste burning -> Sanitation or environment/public health

### 3. Water Supply, Sewerage, and Drainage

**Primary department**

- Water and Sewerage Board

**Possible supporting departments**

- Drainage Department
- Public Health Engineering Department

**Common sub-problems**

- Water leakage
- Pipe burst
- No water supply
- Sewage overflow
- Clogged drains
- Waterlogging
- Manhole overflow

**Typical routing**

- Pipe burst -> Water supply unit
- Sewage overflow -> Sewerage unit
- Clogged drain -> Drainage unit
- Waterlogging -> Drainage or monsoon control cell
- No water supply -> Water distribution team

### 4. Street Lighting and Electrical Infrastructure

**Primary department**

- Electrical Maintenance Department

**Possible supporting departments**

- Power Distribution Company
- Streetlight Maintenance Wing

**Common sub-problems**

- Broken streetlights
- Exposed wires
- Damaged poles
- Transformer fault
- Short circuit risk

**Typical routing**

- Streetlight complaint -> Streetlight maintenance
- Exposed wire -> Electrical safety team
- Damaged pole -> Electrical department
- Transformer fault -> Utility or power distribution entity

### 5. Public Infrastructure and Amenities

**Primary department**

- Civic Engineering or Municipal Maintenance Department

**Possible supporting departments**

- Parks Department
- Public Toilet Maintenance Unit
- Transport Amenities Unit

**Common sub-problems**

- Open manholes
- Damaged bus stops
- Broken benches
- Public toilet damage
- Park maintenance issue
- Damaged government property

**Typical routing**

- Open manhole -> Civic engineering
- Public toilet issue -> Sanitation or amenities maintenance
- Park issue -> Parks department
- Bus stop damage -> Transport or civic infrastructure unit

### 6. Environment and Public Health

**Primary department**

- Public Health Department

**Possible supporting departments**

- Environment Cell
- Horticulture Department
- Sanitation Department

**Common sub-problems**

- Stagnant water
- Mosquito breeding
- Dead animals
- Fallen trees
- Smoke pollution
- Unhygienic public area

**Typical routing**

- Mosquito breeding -> Public health or vector control
- Dead animal -> Sanitation or health response
- Fallen tree -> Horticulture or emergency roads clearance
- Smoke pollution -> Environment or enforcement support

## Emergency domains

### 1. Fire Emergencies

**Primary department**

- Fire and Emergency Services

**Supporting departments**

- Police
- Electrical Department
- Disaster Management Cell

### 2. Flood and Water Disaster

**Primary department**

- Disaster Management Authority

**Supporting departments**

- Drainage Department
- Water Resources Department
- Fire and Rescue

### 3. Structural and Infrastructure Hazard

**Primary department**

- Disaster Management Authority

**Supporting departments**

- Municipal Engineering Department
- Building Safety Authority
- Fire and Rescue

### 4. Electrical Hazard

**Primary department**

- Electrical Safety Response Unit

**Supporting departments**

- Power Utility
- Fire Department
- Disaster Management Cell

### 5. Disaster and Rescue

**Primary department**

- Disaster Management Authority

**Supporting departments**

- Police
- Fire and Rescue
- Local emergency control room

## Routing hierarchy

Recommended routing order:

1. Check emergency flag
2. Detect domain
3. Detect sub-problem
4. Resolve location and ward
5. Apply jurisdiction-specific rule
6. Assign department
7. Apply priority
8. Create work queue entry

## Priority influence on routing

- P1 complaints should route immediately
- Emergency complaints should bypass low-priority queues
- Repeated complaints in same location should raise routing urgency
- Sensitive locations like schools or hospitals should increase attention

## Suggested master department list

- Roads and Public Works
- Sanitation and Solid Waste
- Water Supply
- Sewerage and Drainage
- Electrical and Street Lighting
- Municipal Maintenance and Civic Engineering
- Public Health
- Horticulture and Environment
- Fire and Emergency Services
- Disaster Management Authority
- Traffic and Transport Support

## MVP routing scope

For the first version, implement these direct mappings:

- Roads and Transportation -> Roads and Public Works
- Sanitation and Waste Management -> Sanitation and Solid Waste
- Water Supply, Sewerage, and Drainage -> Water and Sewerage
- Street Lighting and Electrical Infrastructure -> Electrical and Street Lighting
- Public Infrastructure and Amenities -> Municipal Maintenance
- Environment and Public Health -> Public Health

Emergency mappings:

- Fire Emergencies -> Fire and Emergency Services
- Flood and Water Disaster -> Disaster Management Authority
- Structural and Infrastructure Hazard -> Disaster Management Authority
- Electrical Hazard -> Electrical Safety Response
- Disaster and Rescue -> Disaster Management Authority

## Notes

- Different cities may use different department names; store department labels as configurable records.
- Routing should be rule-driven, not hard-coded into page logic.
- Support one primary department and optional supporting departments for future escalation flows.
