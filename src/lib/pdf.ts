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
  const pageWidth = orientation === "landscape" ? 11 : 8.5;
  const pageHeight = orientation === "landscape" ? 8.5 : 11;
  const pdf = new jsPDF({
    unit: "in",
    format: "letter",
    orientation,
  });

  for (const [index, element] of elements.entries()) {
    const image = await captureElement(html2canvas, element, pageWidth, pageHeight);
    if (index > 0) pdf.addPage("letter", orientation);
    pdf.addImage(image.dataUrl, "JPEG", 0, 0, image.width, image.height);
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
    width: `${pageWidth}in`,
    height: `${pageHeight}in`,
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
        background: #ffffff;
        color: #000000;
      }
      * { box-sizing: border-box; }
      ${css}
    </style>
  </head>
  <body></body>
</html>`);
  iframeDoc.close();

  const clone = element.cloneNode(true) as HTMLElement;
  iframeDoc.body.appendChild(clone);
  await waitForPaint();

  try {
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: iframeDoc.body.scrollWidth,
      height: iframeDoc.body.scrollHeight,
      windowWidth: iframeDoc.body.scrollWidth,
      windowHeight: iframeDoc.body.scrollHeight,
    });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    const imageHeight = (canvas.height / canvas.width) * pageWidth;
    const height = Math.min(imageHeight, pageHeight);
    const width =
      imageHeight <= pageHeight + 0.05
        ? pageWidth
        : pageWidth * (pageHeight / imageHeight);
    return { dataUrl, width, height };
  } finally {
    iframe.remove();
  }
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

  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(cssRules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const className of classes) {
        if (className && rule.selectorText.includes(className)) {
          rules.push(rule.cssText);
          break;
        }
      }
    }
  }
  return rules.join("\n");
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
