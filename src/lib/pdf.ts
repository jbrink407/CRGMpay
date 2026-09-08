export const LETTER_LANDSCAPE = { width: 11, height: 8.5 } as const;
const CSS_PX_PER_IN = 96;
const PAGE_PX = {
  width: LETTER_LANDSCAPE.width * CSS_PX_PER_IN,
  height: LETTER_LANDSCAPE.height * CSS_PX_PER_IN,
};

/** html2canvas paints table text slightly high; one small capture-only shift. */
export const PDF_TEXT_NUDGE_PX = 0;

/** Fit an image into a letter-landscape page with a small margin so printers don't clip. */
export function fitToLetterLandscape(
  imageWidthPx: number,
  imageHeightPx: number,
  pageWidth: number = LETTER_LANDSCAPE.width,
  pageHeight: number = LETTER_LANDSCAPE.height,
  margin = 0.06,
) {
  const maxW = Math.max(0.5, pageWidth - margin * 2);
  const maxH = Math.max(0.5, pageHeight - margin * 2);
  const aspect =
    imageWidthPx > 0 && imageHeightPx > 0 ? imageWidthPx / imageHeightPx : pageWidth / pageHeight;
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  };
}

export async function downloadPagesPdf(
  elements: HTMLElement[],
  filename: string,
  orientation: "landscape" | "portrait" = "landscape",
) {
  if (!elements.length) {
    throw new Error("Nothing to print.");
  }

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const pageWidth = orientation === "landscape" ? LETTER_LANDSCAPE.width : LETTER_LANDSCAPE.height;
  const pageHeight = orientation === "landscape" ? LETTER_LANDSCAPE.height : LETTER_LANDSCAPE.width;
  const pdf = new jsPDF({
    unit: "in",
    format: "letter",
    orientation,
  });

  for (const [index, element] of elements.entries()) {
    const image = await captureElement(html2canvas, element, pageWidth, pageHeight);
    if (index > 0) pdf.addPage("letter", orientation);
    pdf.addImage(image.dataUrl, "JPEG", image.x, image.y, image.width, image.height);
  }

  pdf.save(filename);
}

async function captureElement(
  html2canvas: typeof import("html2canvas").default,
  element: HTMLElement,
  pageWidth: number,
  pageHeight: number,
) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${PAGE_PX.width}px`,
    height: `${PAGE_PX.height}px`,
    border: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) {
    iframe.remove();
    throw new Error("Could not open a print surface for the PDF.");
  }

  const css = collectMatchingCss(element);
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${PAGE_PX.width}px;
        height: ${PAGE_PX.height}px;
        background: #ffffff;
        color: #000000;
      }
      * { box-sizing: border-box; }
      html, body, table, td, th, div {
        font-family: "Aptos Narrow", "Arial Narrow", "Roboto Condensed", Arial, Helvetica, sans-serif;
      }
      ${css}
      [data-print-root] {
        width: ${PAGE_PX.width}px !important;
        height: ${PAGE_PX.height}px !important;
      }
    </style>
  </head>
  <body></body>
</html>`);
  iframeDoc.close();

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${PAGE_PX.width}px`;
  clone.style.height = `${PAGE_PX.height}px`;
  iframeDoc.body.appendChild(clone);
  await waitForPaint();

  try {
    if (iframeDoc.fonts?.ready) {
      await iframeDoc.fonts.ready;
    }
    const target =
      (clone.querySelector(":scope > div") as HTMLElement | null) ?? clone;
    target.style.width = `${PAGE_PX.width}px`;
    target.style.height = `${PAGE_PX.height}px`;
    const canvas = await html2canvas(target, {
      scale: captureScale(),
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: PAGE_PX.width,
      height: PAGE_PX.height,
      windowWidth: PAGE_PX.width,
      windowHeight: PAGE_PX.height,
      scrollX: 0,
      scrollY: 0,
    });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    const box = fitToLetterLandscape(canvas.width, canvas.height, pageWidth, pageHeight);
    return { dataUrl, ...box };
  } finally {
    iframe.remove();
  }
}

function captureScale() {
  return 2;
}

function collectMatchingCss(element: HTMLElement): string {
  const classes = new Set<string>();
  const add = (value: string) => {
    value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => classes.add(item));
  };
  add(element.className?.toString?.() ?? "");
  element.querySelectorAll("*").forEach((node) => {
    add((node as HTMLElement).className?.toString?.() ?? "");
  });

  const fontFaces: string[] = [];
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(cssRules)) {
      if (rule instanceof CSSFontFaceRule) {
        fontFaces.push(rule.cssText);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const className of classes) {
        if (className && rule.selectorText.includes(className)) {
          rules.push(rule.cssText);
          break;
        }
      }
    }
  }
  return `${fontFaces.join("\n")}\n${rules.join("\n")}`;
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
