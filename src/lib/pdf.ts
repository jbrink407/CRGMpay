export async function downloadElementPdf(
  element: HTMLElement,
  filename: string,
) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "8.5in",
    height: "11in",
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

    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      unit: "in",
      format: "letter",
      orientation: "portrait",
    });
    const pageWidth = 8.5;
    const pageHeight = 11;
    const imageHeight = (canvas.height / canvas.width) * pageWidth;

    if (imageHeight <= pageHeight + 0.05) {
      pdf.addImage(image, "PNG", 0, 0, pageWidth, Math.min(imageHeight, pageHeight));
    } else {
      const ratio = pageHeight / imageHeight;
      const width = pageWidth * ratio;
      pdf.addImage(image, "PNG", (pageWidth - width) / 2, 0, width, pageHeight);
    }

    pdf.save(filename);
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
        if (rule.selectorText.includes(className)) {
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
