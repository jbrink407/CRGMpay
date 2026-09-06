export async function downloadElementPdf(
  element: HTMLElement,
  filename: string,
) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
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

  if (imageHeight <= pageHeight) {
    pdf.addImage(image, "PNG", 0, 0, pageWidth, imageHeight);
  } else {
    const ratio = pageHeight / imageHeight;
    const width = pageWidth * ratio;
    const x = (pageWidth - width) / 2;
    pdf.addImage(image, "PNG", x, 0, width, pageHeight);
  }

  pdf.save(filename);
}
