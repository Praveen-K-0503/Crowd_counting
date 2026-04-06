export type Domain = {
  title: string;
  summary: string;
  examples: string[];
  emergency?: boolean;
};

export const mainDomains: Domain[] = [
  {
    title: "Roads and Transportation",
    summary: "Road safety, traffic support, and mobility complaints.",
    examples: ["Potholes", "Damaged roads", "Broken traffic signals", "Road blockage"],
  },
  {
    title: "Sanitation and Waste Management",
    summary: "Waste collection, cleanliness, and public sanitation issues.",
    examples: ["Overflowing bins", "Illegal dumping", "Uncleared waste", "Dirty public spaces"],
  },
  {
    title: "Water Supply, Sewerage, and Drainage",
    summary: "Water access, sewer overflow, drainage, and monsoon waterlogging.",
    examples: ["Water leakage", "Sewage overflow", "Clogged drains", "Waterlogging"],
  },
  {
    title: "Street Lighting and Electrical Infrastructure",
    summary: "Public lighting and electrical safety problems.",
    examples: ["Broken streetlights", "Exposed wires", "Pole damage", "Transformer complaint"],
  },
  {
    title: "Public Infrastructure and Amenities",
    summary: "Maintenance needs for public assets and shared facilities.",
    examples: ["Open manholes", "Damaged bus stops", "Broken public toilets", "Park maintenance"],
  },
  {
    title: "Environment and Public Health",
    summary: "Public hygiene and environmental safety concerns.",
    examples: ["Stagnant water", "Mosquito breeding", "Dead animals", "Fallen trees"],
  },
];

export const emergencyDomains: Domain[] = [
  {
    title: "Fire Emergencies",
    summary: "Immediate reporting for fire and smoke incidents.",
    examples: ["Fire outbreak", "Electrical fire", "Smoke from public area"],
    emergency: true,
  },
  {
    title: "Flood and Water Disaster",
    summary: "Critical flooding and severe water accumulation events.",
    examples: ["Street flooding", "Drain overflow", "Major waterlogging"],
    emergency: true,
  },
  {
    title: "Structural and Infrastructure Hazard",
    summary: "Unsafe buildings, walls, bridges, and structural failures.",
    examples: ["Wall collapse", "Bridge crack", "Building collapse risk"],
    emergency: true,
  },
  {
    title: "Electrical Hazard",
    summary: "High-risk public electrical incidents requiring urgent attention.",
    examples: ["Live wire", "Transformer blast", "Major short circuit"],
    emergency: true,
  },
  {
    title: "Disaster and Rescue",
    summary: "Storm damage, obstruction, and rescue-related emergency situations.",
    examples: ["Storm damage", "Landslide", "Tree fall blocking road"],
    emergency: true,
  },
];
