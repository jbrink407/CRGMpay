export interface PieceCode {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
}

export function newCodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ensureCodeIds(
  codes: Array<Partial<PieceCode> & { code?: string }>,
): PieceCode[] {
  const seen = new Set<string>();
  const mapped = codes.map((item, index) => {
    const code = String(item.code || "").toUpperCase();
    const base: PieceCode = {
      id: "",
      code,
      description: String(item.description || ""),
      unit: String(item.unit || "ea"),
      rate: Number(item.rate) || 0,
    };
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      return { ...base, id: item.id };
    }
    const fromCode = code ? `job-${code}` : `job-new-${index}`;
    let id = fromCode;
    let n = 2;
    while (seen.has(id)) id = `${fromCode}-${n++}`;
    seen.add(id);
    return { ...base, id };
  });
  return sortCodes(mapped);
}

export function sortCodes(codes: PieceCode[]): PieceCode[] {
  return [...codes].sort((a, b) => {
    const left = a.code.trim();
    const right = b.code.trim();
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

/**
 * Company piece-rate job codes from the CR pay sheet rate list.
 * Descriptions can be filled in later; payroll matches on code.
 */
const STARTER_RATES: [string, number][] = [
  ["BHL", 1.64],
  ["GBL", 8.2],
  ["BCLAB", 2.46],
  ["BORE", 10.25],
  ["DRSTLAB", 0.52],
  ["REKEY", 20.5],
  ["HSLAB", 4.1],
  ["ENTLAB", 2.46],
  ["LOCLAB", 1.85],
  ["KICKLAB", 1.85],
  ["LKHNGLAB", 1.22],
  ["FECLAB", 6.56],
  ["FEXLAB", 1.64],
  ["BEVIN", 1.64],
  ["BSMC", 2.46],
  ["CGL", 2.87],
  ["CGR", 4.1],
  ["COML", 0.74],
  ["FGL", 4.1],
  ["FGLR", 4.1],
  ["FMLC", 8.2],
  ["JBARLAB", 5.74],
  ["LITEMNT", 4.92],
  ["MBPLAB", 12.3],
  ["MCLAB", 6.56],
  ["OML", 4.1],
  ["VML", 0.41],
  ["CLIPSLAB", 8.2],
  ["VMR", 0.62],
  ["SIL", 0.48],
  ["SRL", 0.37],
  ["FD791LAB", 39.36],
  ["FD793LAB", 49.2],
  ["FD794LAB", 55.76],
  ["FDSDL", 39.36],
  ["FDSDR", 16.4],
  ["FSDL", 45.1],
  ["FSPL", 36.9],
  ["FSR", 20.5],
  ["STEAMLAB", 41.0],
  ["SWL", 16.4],
  ["XPANEL", 8.2],
  ["FDCSDLAB", 82.0],
];

export const STARTER_CODES: PieceCode[] = STARTER_RATES.map(([code, rate]) => ({
  id: `job-${code}`,
  code,
  description: "",
  unit: "ea",
  rate,
}));

export function findCode(
  codes: PieceCode[],
  code: string,
): PieceCode | undefined {
  const needle = code.trim().toUpperCase();
  return codes.find((item) => item.code.trim().toUpperCase() === needle);
}

export function emptyCode(partial: Partial<PieceCode> = {}): PieceCode {
  return {
    id: newCodeId(),
    code: "",
    description: "",
    unit: "ea",
    rate: 0,
    ...partial,
  };
}

export function parseCodeCsv(text: string): PieceCode[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const codes: PieceCode[] = [];
  for (const line of lines) {
    if (/^code\b/i.test(line)) continue;
    const parts = line.split(/[,\t;]/).map((part) => part.trim());
    if (parts.length < 2) continue;
    const [code, descriptionOrRate, unitOrRate, ratePart] = parts;
    if (!code) continue;
    const asRate = Number.parseFloat(
      (ratePart || unitOrRate || descriptionOrRate || "0").replace(/[$,]/g, ""),
    );
    const looksLikeRate = /^\d+(\.\d+)?$/.test(
      (descriptionOrRate || "").replace(/[$,]/g, ""),
    );
    if (parts.length === 2 && looksLikeRate) {
      codes.push({
        id: newCodeId(),
        code: code.toUpperCase(),
        description: "",
        unit: "ea",
        rate: asRate || 0,
      });
      continue;
    }
    codes.push({
      id: newCodeId(),
      code: code.toUpperCase(),
      description: looksLikeRate ? "" : descriptionOrRate || "",
      unit: parts.length >= 4 ? unitOrRate || "ea" : "ea",
      rate: asRate || 0,
    });
  }
  return sortCodes(codes);
}

export function codesToCsv(codes: PieceCode[]): string {
  return [
    "code,description,unit,rate",
    ...codes.map(
      (item) => `${item.code},${item.description},${item.unit},${item.rate}`,
    ),
  ].join("\n");
}
