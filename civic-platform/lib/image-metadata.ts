export type ImageGpsMetadata = {
  latitude: number;
  longitude: number;
};

type TiffReader = {
  view: DataView;
  littleEndian: boolean;
  tiffStart: number;
};

function readAscii(view: DataView, start: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(start + index));
  }

  return value;
}

function getTagValueOffset(reader: TiffReader, entryOffset: number) {
  const componentCount = reader.view.getUint32(entryOffset + 4, reader.littleEndian);
  const valueOffset = entryOffset + 8;

  if (componentCount <= 4) {
    return valueOffset;
  }

  return reader.tiffStart + reader.view.getUint32(valueOffset, reader.littleEndian);
}

function readRational(reader: TiffReader, offset: number) {
  const numerator = reader.view.getUint32(offset, reader.littleEndian);
  const denominator = reader.view.getUint32(offset + 4, reader.littleEndian);

  return denominator === 0 ? 0 : numerator / denominator;
}

function readGpsCoordinate(reader: TiffReader, offset: number) {
  const degrees = readRational(reader, offset);
  const minutes = readRational(reader, offset + 8);
  const seconds = readRational(reader, offset + 16);

  return degrees + minutes / 60 + seconds / 3600;
}

function readIfdEntries(reader: TiffReader, ifdOffset: number) {
  const entries = new Map<number, number>();
  const entryCount = reader.view.getUint16(ifdOffset, reader.littleEndian);

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const tag = reader.view.getUint16(entryOffset, reader.littleEndian);
    entries.set(tag, entryOffset);
  }

  return entries;
}

export async function extractGpsFromImage(file: File): Promise<ImageGpsMetadata | null> {
  if (!file.type.startsWith("image/jpeg") && !file.name.toLowerCase().endsWith(".jpg") && !file.name.toLowerCase().endsWith(".jpeg")) {
    return null;
  }

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (view.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;

  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;

    const segmentLength = view.getUint16(offset);
    offset += 2;

    if (marker === 0xffe1 && readAscii(view, offset, 6) === "Exif\0\0") {
      const tiffStart = offset + 6;
      const byteOrder = readAscii(view, tiffStart, 2);
      const littleEndian = byteOrder === "II";

      if (!littleEndian && byteOrder !== "MM") {
        return null;
      }

      const reader = { view, littleEndian, tiffStart };
      const firstIfdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
      const entries = readIfdEntries(reader, firstIfdOffset);
      const gpsEntryOffset = entries.get(0x8825);

      if (!gpsEntryOffset) {
        return null;
      }

      const gpsIfdOffset = tiffStart + view.getUint32(gpsEntryOffset + 8, littleEndian);
      const gpsEntries = readIfdEntries(reader, gpsIfdOffset);
      const latitudeRefEntry = gpsEntries.get(0x0001);
      const latitudeEntry = gpsEntries.get(0x0002);
      const longitudeRefEntry = gpsEntries.get(0x0003);
      const longitudeEntry = gpsEntries.get(0x0004);

      if (!latitudeRefEntry || !latitudeEntry || !longitudeRefEntry || !longitudeEntry) {
        return null;
      }

      const latitudeRef = readAscii(view, getTagValueOffset(reader, latitudeRefEntry), 1);
      const longitudeRef = readAscii(view, getTagValueOffset(reader, longitudeRefEntry), 1);
      let latitude = readGpsCoordinate(reader, getTagValueOffset(reader, latitudeEntry));
      let longitude = readGpsCoordinate(reader, getTagValueOffset(reader, longitudeEntry));

      if (latitudeRef === "S") latitude *= -1;
      if (longitudeRef === "W") longitude *= -1;

      return { latitude, longitude };
    }

    offset += segmentLength - 2;
  }

  return null;
}

export type CivicImageSignal = {
  label: string;
  confidence: number;
  matchedSignals: string[];
};

const imageFileNameRules = [
  { label: "Roads and Transportation", signals: ["pothole", "road", "traffic", "signal", "footpath"] },
  { label: "Sanitation and Waste Management", signals: ["garbage", "trash", "waste", "dump", "bin"] },
  { label: "Water Supply, Sewerage, and Drainage", signals: ["drain", "sewage", "waterlog", "leak", "pipe"] },
  { label: "Street Lighting and Electrical Infrastructure", signals: ["streetlight", "light", "wire", "pole", "transformer"] },
  { label: "Public Infrastructure and Amenities", signals: ["manhole", "bench", "toilet", "park", "bus-stop"] },
  { label: "Environment and Public Health", signals: ["mosquito", "tree", "smoke", "pollution", "dead-animal"] },
  { label: "Fire Emergencies", signals: ["fire", "flame", "burning", "smoke"] },
  { label: "Flood and Water Disaster", signals: ["flood", "storm", "landslide", "collapse"] },
];

export function classifyImageEvidence(file: File): CivicImageSignal | null {
  const fileName = file.name.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  const scored = imageFileNameRules
    .map((rule) => {
      const matchedSignals = rule.signals.filter((signal) => fileName.includes(signal));

      return {
        label: rule.label,
        confidence: Math.min(0.82, 0.35 + matchedSignals.length * 0.18),
        matchedSignals,
      };
    })
    .filter((item) => item.matchedSignals.length > 0)
    .sort((left, right) => right.confidence - left.confidence);

  return scored[0] ?? null;
}
