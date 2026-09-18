const textEncoder = new TextEncoder();

export async function createZipBlob(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new TypeError("At least one ZIP entry is required.");
  }

  const normalizedEntries = await Promise.all(entries.map(normalizeEntry));
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of normalizedEntries) {
    const localHeader = createLocalHeader(entry);
    const centralHeader = createCentralHeader(entry, offset);
    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((size, part) => size + part.length, 0);
  const endRecord = createEndRecord(normalizedEntries.length, centralSize, offset);

  return new Blob([...localParts, ...centralParts, endRecord], {
    type: "application/zip",
  });
}

async function normalizeEntry(entry) {
  if (!entry || typeof entry.name !== "string" || !entry.name) {
    throw new TypeError("Each ZIP entry needs a name.");
  }

  const data = new Uint8Array(await new Blob([entry.data]).arrayBuffer());
  const name = textEncoder.encode(entry.name);

  if (name.length > 0xffff || data.length > 0xffffffff) {
    throw new RangeError("ZIP entry is too large.");
  }

  return { crc: crc32(data), data, name };
}

function createLocalHeader(entry) {
  const header = new Uint8Array(30 + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint32(14, entry.crc, true);
  view.setUint32(18, entry.data.length, true);
  view.setUint32(22, entry.data.length, true);
  view.setUint16(26, entry.name.length, true);
  header.set(entry.name, 30);
  return header;
}

function createCentralHeader(entry, offset) {
  const header = new Uint8Array(46 + entry.name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.data.length, true);
  view.setUint32(24, entry.data.length, true);
  view.setUint16(28, entry.name.length, true);
  view.setUint32(42, offset, true);
  header.set(entry.name, 46);
  return header;
}

function createEndRecord(entryCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

function crc32(data) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
