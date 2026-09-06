export interface PieceCode {
  code: string;
  description: string;
  unit: string;
  rate: number;
}

/**
 * Company piece-rate job codes from the CR pay sheet rate list.
 * Descriptions can be filled in later; payroll matches on code.
 */
export const STARTER_CODES: PieceCode[] = [
  { code: "BHL", description: "", unit: "ea", rate: 1.64 },
  { code: "GBL", description: "", unit: "ea", rate: 8.2 },
  { code: "BCLAB", description: "", unit: "ea", rate: 2.46 },
  { code: "BORE", description: "", unit: "ea", rate: 10.25 },
  { code: "DRSTLAB", description: "", unit: "ea", rate: 0.52 },
  { code: "REKEY", description: "", unit: "ea", rate: 20.5 },
  { code: "HSLAB", description: "", unit: "ea", rate: 4.1 },
  { code: "ENTLAB", description: "", unit: "ea", rate: 2.46 },
  { code: "LOCLAB", description: "", unit: "ea", rate: 1.85 },
  { code: "KICKLAB", description: "", unit: "ea", rate: 1.85 },
  { code: "LKHNGLAB", description: "", unit: "ea", rate: 1.22 },
  { code: "FECLAB", description: "", unit: "ea", rate: 6.56 },
  { code: "FEXLAB", description: "", unit: "ea", rate: 1.64 },
  { code: "BEVIN", description: "", unit: "ea", rate: 1.64 },
  { code: "BSMC", description: "", unit: "ea", rate: 2.46 },
  { code: "CGL", description: "", unit: "ea", rate: 2.87 },
  { code: "CGR", description: "", unit: "ea", rate: 4.1 },
  { code: "COML", description: "", unit: "ea", rate: 0.74 },
  { code: "FGL", description: "", unit: "ea", rate: 4.1 },
  { code: "FGLR", description: "", unit: "ea", rate: 4.1 },
  { code: "FMLC", description: "", unit: "ea", rate: 8.2 },
  { code: "JBARLAB", description: "", unit: "ea", rate: 5.74 },
  { code: "LITEMNT", description: "", unit: "ea", rate: 4.92 },
  { code: "MBPLAB", description: "", unit: "ea", rate: 12.3 },
  { code: "MCLAB", description: "", unit: "ea", rate: 6.56 },
  { code: "OML", description: "", unit: "ea", rate: 4.1 },
  { code: "VML", description: "", unit: "ea", rate: 0.41 },
  { code: "CLIPSLAB", description: "", unit: "ea", rate: 8.2 },
  { code: "VMR", description: "", unit: "ea", rate: 0.62 },
  { code: "SIL", description: "", unit: "ea", rate: 0.48 },
  { code: "SRL", description: "", unit: "ea", rate: 0.37 },
  { code: "FD791LAB", description: "", unit: "ea", rate: 39.36 },
  { code: "FD793LAB", description: "", unit: "ea", rate: 49.2 },
  { code: "FD794LAB", description: "", unit: "ea", rate: 55.76 },
  { code: "FDSDL", description: "", unit: "ea", rate: 39.36 },
  { code: "FDSDR", description: "", unit: "ea", rate: 16.4 },
  { code: "FSDL", description: "", unit: "ea", rate: 45.1 },
  { code: "FSPL", description: "", unit: "ea", rate: 36.9 },
  { code: "FSR", description: "", unit: "ea", rate: 20.5 },
  { code: "STEAMLAB", description: "", unit: "ea", rate: 41.0 },
  { code: "SWL", description: "", unit: "ea", rate: 16.4 },
  { code: "XPANEL", description: "", unit: "ea", rate: 8.2 },
  { code: "FDCSDLAB", description: "", unit: "ea", rate: 82.0 },
];

export function findCode(
  codes: PieceCode[],
  code: string,
): PieceCode | undefined {
  const needle = code.trim().toUpperCase();
  return codes.find((item) => item.code.trim().toUpperCase() === needle);
}

export function emptyCode(partial: Partial<PieceCode> = {}): PieceCode {
  return {
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
        code: code.toUpperCase(),
        description: "",
        unit: "ea",
        rate: asRate || 0,
      });
      continue;
    }
    codes.push({
      code: code.toUpperCase(),
      description: looksLikeRate ? "" : descriptionOrRate || "",
      unit: parts.length >= 4 ? unitOrRate || "ea" : "ea",
      rate: asRate || 0,
    });
  }
  return codes;
}

export function codesToCsv(codes: PieceCode[]): string {
  return [
    "code,description,unit,rate",
    ...codes.map(
      (item) => `${item.code},${item.description},${item.unit},${item.rate}`,
    ),
  ].join("\n");
}
