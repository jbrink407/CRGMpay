import { createBlankSheet, type PaySheet } from "@/lib/pay-sheet";

const DRAFT_KEY = "crgmpay:draft";
const COMPANY_KEY = "crgmpay:company";

export interface CompanyDefaults {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

export function loadDraft(): PaySheet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaySheet;
    if (!parsed || typeof parsed !== "object") return null;
    return { ...createBlankSheet(), ...parsed, jobs: parsed.jobs ?? [] };
  } catch {
    return null;
  }
}

export function saveDraft(sheet: PaySheet) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sheet));
  saveCompany({
    companyName: sheet.companyName,
    companyAddress: sheet.companyAddress,
    companyPhone: sheet.companyPhone,
  });
}

export function loadCompany(): CompanyDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyDefaults;
  } catch {
    return null;
  }
}

export function saveCompany(company: CompanyDefaults) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}
