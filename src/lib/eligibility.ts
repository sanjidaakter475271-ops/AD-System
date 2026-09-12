// Win 10 Logic
export function calcWin10(
  processor: string | null,
  generation: number | null,
  ram: number | null
): string {
  const iSeries = ["I3", "I5", "I7", "I9"];
  const isSeries = processor ? iSeries.includes(processor.toUpperCase()) : false;
  const isGen6or7 = generation !== null && generation >= 6 && generation <= 7;
  const hasEnoughRam = ram !== null && ram >= 8;

  // New Logic: 6th gen er nicher kichu eligible hobe na, RAM jai thakuk.
  if (generation !== null && generation < 6) {
    return "Not Eligible";
  }

  if ((isSeries && isGen6or7) || hasEnoughRam) return "Eligible";
  return "Not Eligible";
}

// Win 11 Logic
// Condition: If SSD exists AND Generation >= 8 AND HDD exists -> "Recommended for Win 11"
export function calcWin11(
  processor: string | null,
  generation: number | null,
  ram: number | null,
  ssd: number,
  hdd: number
): string {
  // Direct check for user requirement:
  // "jodi ssd tahke adn genration 8th ba tar upore thake adn hdd tahke tahole amar eikhne likha ashbe recommanded for win 11"
  if (ssd > 0 && hdd > 0 && generation !== null && generation >= 8) {
    return "Recommended for Win 11";
  }

  const iSeries = ["I3", "I5", "I7", "I9"];
  const isSeries = processor ? iSeries.includes(processor.toUpperCase()) : false;
  const isGen8Plus = generation !== null && generation >= 8;
  const hasEnoughRam = ram !== null && ram >= 8;
  const hasStorage = (ssd + hdd) >= 64;

  if (isSeries && isGen8Plus && hasEnoughRam && hasStorage) {
    return "Eligible";
  }

  if (ssd > 0 && isGen8Plus) {
    return "Recommended for Win 11";
  }

  return "Not Eligible";
}

// Storage Type
export function calcStorageType(ssd: number, hdd: number): string {
  if (ssd > 0 && hdd > 0) return "SSD + HDD";
  if (ssd > 0) return "SSD Only";
  if (hdd > 0) return "HDD Only";
  return "Unknown";
}
