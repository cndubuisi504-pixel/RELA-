import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import QRCode from "qrcode";

export type ReceiptPdfData = {
  receiptId: string;
  receiptNumber: string;
  orderNumber?: string | null;
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  items: Array<{
    name: string;
    description?: string | null;
    size?: string | null;
    colour?: string | null;
    quantity: number;
    unit_price: number;
    total?: number;
  }>;
  charges?: Array<{
    name: string;
    amount: number;
  }>;
  deliveryFee?: number;
  discount?: number;
  tax?: number;
  currency: string;
  total: number;
  paymentMethod?: string | null;
  paymentChannel?: string | null;
  paymentReference?: string | null;
  paymentStatus: string;
  purchaseDate: string;
  verificationUrl: string;
  isTest?: boolean;
  isVoid?: boolean;
  isKobo?: boolean;
};

function formatMoney(amount: number, currency: string, isKobo: boolean = false): string {
  const code = (currency || "NGN").toUpperCase();
  const numeric = isKobo ? (amount / 100) : amount;
  const formatted = Number(numeric || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${code} ${formatted}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  } catch {
    return iso;
  }
}

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorInk = rgb(0.08, 0.08, 0.09);
  const colorMuted = rgb(0.42, 0.44, 0.48);
  const colorLine = rgb(0.88, 0.89, 0.91);
  const colorBgSoft = rgb(0.96, 0.96, 0.97);
  const colorGreen = rgb(0.09, 0.55, 0.28);
  const colorGreenBg = rgb(0.91, 0.97, 0.93);
  const colorAmber = rgb(0.72, 0.44, 0.02);
  const colorAmberBg = rgb(0.99, 0.95, 0.86);
  const colorRed = rgb(0.78, 0.12, 0.12);
  const colorRedBg = rgb(0.99, 0.91, 0.91);
  const colorWhite = rgb(1, 1, 1);

  const isKobo = Boolean(data.isKobo);

  let cursorY = height - 44;

  // 0. Test Mode or Void Banner at the very top if applicable
  if (data.isVoid) {
    page.drawRectangle({
      x: 44,
      y: cursorY - 10,
      width: width - 88,
      height: 22,
      color: colorRedBg,
      borderColor: colorRed,
      borderWidth: 1,
    });
    const voidNotice = "VOID / REFUNDED TRANSACTION — THIS RECEIPT IS CANCELED";
    const voidWidth = fontBold.widthOfTextAtSize(voidNotice, 9);
    page.drawText(voidNotice, {
      x: (width - voidWidth) / 2,
      y: cursorY - 4,
      size: 9,
      font: fontBold,
      color: colorRed,
    });
    cursorY -= 30;
  } else if (data.isTest) {
    page.drawRectangle({
      x: 44,
      y: cursorY - 10,
      width: width - 88,
      height: 22,
      color: colorAmberBg,
      borderColor: colorAmber,
      borderWidth: 1,
    });
    const testNotice = "TEST RECEIPT — SIMULATED TRANSACTION · NOT A VALID PAYMENT RECORD";
    const testWidth = fontBold.widthOfTextAtSize(testNotice, 9);
    page.drawText(testNotice, {
      x: (width - testWidth) / 2,
      y: cursorY - 4,
      size: 9,
      font: fontBold,
      color: colorAmber,
    });
    cursorY -= 30;
  }

  // 1. Top Bar / Header
  page.drawRectangle({
    x: 44,
    y: cursorY - 6,
    width: 60,
    height: 24,
    color: colorBgSoft,
    borderColor: colorLine,
    borderWidth: 1,
  });
  page.drawText("rela.", {
    x: 54,
    y: cursorY + 1,
    size: 13,
    font: fontBold,
    color: colorInk,
  });

  const docTitle = data.isTest ? "TEST RECEIPT" : "OFFICIAL PAYMENT RECEIPT";
  page.drawText(docTitle, {
    x: 114,
    y: cursorY + 2,
    size: 9.5,
    font: fontBold,
    color: data.isTest ? colorAmber : colorMuted,
  });

  // Receipt Number & Date (top right)
  const recNumber = data.receiptNumber;
  const numWidth = fontBold.widthOfTextAtSize(recNumber, 13);
  page.drawText(recNumber, {
    x: width - 44 - numWidth,
    y: cursorY + 1,
    size: 13,
    font: fontBold,
    color: colorInk,
  });

  const dateStr = `Issued: ${formatDate(data.purchaseDate)}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, {
    x: width - 44 - dateWidth,
    y: cursorY - 14,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });

  cursorY -= 36;

  // Divider line
  page.drawLine({
    start: { x: 44, y: cursorY },
    end: { x: width - 44, y: cursorY },
    color: colorLine,
    thickness: 1,
  });

  cursorY -= 20;

  // 2. Status Banner
  let bannerBg = colorGreenBg;
  let bannerBorder = rgb(0.72, 0.88, 0.77);
  let bannerTextCol = colorGreen;
  let bannerLabel = `STATUS: ${(data.paymentStatus || "PAID").toUpperCase()}`;

  if (data.isVoid) {
    bannerBg = colorRedBg;
    bannerBorder = rgb(0.95, 0.7, 0.7);
    bannerTextCol = colorRed;
    bannerLabel = "STATUS: VOID / REFUNDED";
  } else if (data.isTest) {
    bannerBg = colorAmberBg;
    bannerBorder = rgb(0.95, 0.82, 0.6);
    bannerTextCol = colorAmber;
    bannerLabel = "STATUS: TEST MODE (SIMULATED)";
  }

  page.drawRectangle({
    x: 44,
    y: cursorY - 24,
    width: width - 88,
    height: 32,
    color: bannerBg,
    borderColor: bannerBorder,
    borderWidth: 1,
  });

  page.drawText(bannerLabel, {
    x: 58,
    y: cursorY - 13,
    size: 10,
    font: fontBold,
    color: bannerTextCol,
  });

  const methodDisplay = data.paymentMethod ? data.paymentMethod.replace(/_/g, " ").toUpperCase() : null;
  const channelDisplay = data.paymentChannel ? `(${data.paymentChannel.toUpperCase()})` : null;
  const methodStr = [methodDisplay, channelDisplay].filter(Boolean).join(" ");

  const refInfo = [
    data.orderNumber ? `Ref: ${data.orderNumber}` : null,
    methodStr ? `Method: ${methodStr}` : null,
    data.paymentReference && data.paymentReference !== data.orderNumber ? `Trx: ${data.paymentReference}` : null,
  ].filter(Boolean).join("  |  ");

  if (refInfo) {
    const refWidth = fontRegular.widthOfTextAtSize(refInfo, 8.5);
    page.drawText(refInfo, {
      x: width - 58 - refWidth,
      y: cursorY - 13,
      size: 8.5,
      font: fontRegular,
      color: bannerTextCol,
    });
  }

  cursorY -= 48;

  // 3. Parties Section (Business & Customer)
  const colWidth = (width - 88 - 24) / 2;
  const leftX = 44;
  const rightX = 44 + colWidth + 24;

  // Left Column: Business
  page.drawText("ISSUED BY", {
    x: leftX,
    y: cursorY,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });
  cursorY -= 14;

  page.drawText(data.business.name || "Business", {
    x: leftX,
    y: cursorY,
    size: 11.5,
    font: fontBold,
    color: colorInk,
  });
  cursorY -= 13;

  if (data.business.address) {
    page.drawText(data.business.address, {
      x: leftX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    cursorY -= 12;
  }

  if (data.business.phone) {
    page.drawText(`Phone: ${data.business.phone}`, {
      x: leftX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    cursorY -= 12;
  }

  if (data.business.email) {
    page.drawText(`Email: ${data.business.email}`, {
      x: leftX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    cursorY -= 12;
  }

  // Right Column: Customer
  let custY = cursorY + (data.business.email ? 49 : (data.business.phone ? 37 : 25));

  page.drawText("ISSUED TO (CUSTOMER)", {
    x: rightX,
    y: custY,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });
  custY -= 14;

  page.drawText(data.customer.name || "Customer", {
    x: rightX,
    y: custY,
    size: 11.5,
    font: fontBold,
    color: colorInk,
  });
  custY -= 13;

  if (data.customer.email) {
    page.drawText(`Email: ${data.customer.email}`, {
      x: rightX,
      y: custY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    custY -= 12;
  }

  if (data.customer.phone) {
    page.drawText(`Phone: ${data.customer.phone}`, {
      x: rightX,
      y: custY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
  }

  cursorY = Math.min(cursorY, custY) - 18;

  // 4. Items Table Header
  page.drawRectangle({
    x: 44,
    y: cursorY - 18,
    width: width - 88,
    height: 22,
    color: colorBgSoft,
  });

  page.drawText("ITEM & DESCRIPTION", {
    x: 52,
    y: cursorY - 11,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText("QTY", {
    x: 320,
    y: cursorY - 11,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText("UNIT PRICE", {
    x: 375,
    y: cursorY - 11,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });
  page.drawText("AMOUNT", {
    x: 480,
    y: cursorY - 11,
    size: 8.5,
    font: fontBold,
    color: colorMuted,
  });

  cursorY -= 28;

  // Table Rows
  let subtotal = 0;
  for (const item of data.items) {
    const lineTotal = item.total ?? (item.quantity * item.unit_price);
    subtotal += lineTotal;

    page.drawText(item.name || "Item", {
      x: 52,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: colorInk,
    });

    page.drawText(String(item.quantity), {
      x: 324,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: colorInk,
    });

    const upStr = formatMoney(item.unit_price, data.currency, isKobo);
    page.drawText(upStr, {
      x: 375,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorInk,
    });

    const laStr = formatMoney(lineTotal, data.currency, isKobo);
    const laWidth = fontBold.widthOfTextAtSize(laStr, 9.5);
    page.drawText(laStr, {
      x: width - 52 - laWidth,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: colorInk,
    });

    cursorY -= 12;

    const details = [];
    if (item.description && item.description !== item.name) details.push(item.description);
    if (item.size) details.push(`Size: ${item.size}`);
    if (item.colour) details.push(`Colour: ${item.colour}`);

    if (details.length > 0) {
      const detailStr = details.join("  |  ");
      page.drawText(detailStr, {
        x: 52,
        y: cursorY,
        size: 8,
        font: fontOblique,
        color: colorMuted,
      });
      cursorY -= 12;
    }

    cursorY -= 3;
    page.drawLine({
      start: { x: 52, y: cursorY },
      end: { x: width - 52, y: cursorY },
      color: rgb(0.94, 0.94, 0.95),
      thickness: 0.5,
    });
    cursorY -= 10;
  }

  cursorY -= 6;

  // 5. Charges / Delivery / Breakdown
  const breakdownLabelX = 330;
  const breakdownValueRight = width - 52;

  page.drawText("Subtotal", {
    x: breakdownLabelX,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  const subStr = formatMoney(subtotal, data.currency, isKobo);
  const subWidth = fontRegular.widthOfTextAtSize(subStr, 9);
  page.drawText(subStr, {
    x: breakdownValueRight - subWidth,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: colorInk,
  });
  cursorY -= 15;

  // Delivery fee (if passed directly as deliveryFee)
  if (data.deliveryFee && data.deliveryFee > 0) {
    page.drawText("Delivery Fee", {
      x: breakdownLabelX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    const dfStr = formatMoney(data.deliveryFee, data.currency, isKobo);
    const dfWidth = fontRegular.widthOfTextAtSize(dfStr, 9);
    page.drawText(dfStr, {
      x: breakdownValueRight - dfWidth,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorInk,
    });
    cursorY -= 15;
  }

  // Other charges
  if (data.charges && data.charges.length > 0) {
    for (const charge of data.charges) {
      page.drawText(charge.name || "Delivery", {
        x: breakdownLabelX,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: colorMuted,
      });
      const chgStr = formatMoney(charge.amount, data.currency, isKobo);
      const chgWidth = fontRegular.widthOfTextAtSize(chgStr, 9);
      page.drawText(chgStr, {
        x: breakdownValueRight - chgWidth,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: colorInk,
      });
      cursorY -= 15;
    }
  }

  // Discount
  if (data.discount && data.discount > 0) {
    page.drawText("Discount", {
      x: breakdownLabelX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    const discStr = `-${formatMoney(data.discount, data.currency, isKobo)}`;
    const discWidth = fontRegular.widthOfTextAtSize(discStr, 9);
    page.drawText(discStr, {
      x: breakdownValueRight - discWidth,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorGreen,
    });
    cursorY -= 15;
  }

  // Tax
  if (data.tax && data.tax > 0) {
    page.drawText("Tax / VAT", {
      x: breakdownLabelX,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    const taxStr = formatMoney(data.tax, data.currency, isKobo);
    const taxWidth = fontRegular.widthOfTextAtSize(taxStr, 9);
    page.drawText(taxStr, {
      x: breakdownValueRight - taxWidth,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorInk,
    });
    cursorY -= 15;
  }

  cursorY -= 4;

  // Total Box
  page.drawRectangle({
    x: breakdownLabelX - 8,
    y: cursorY - 14,
    width: width - breakdownLabelX - 44 + 8,
    height: 28,
    color: colorInk,
  });

  page.drawText("TOTAL PAID", {
    x: breakdownLabelX,
    y: cursorY - 4,
    size: 10,
    font: fontBold,
    color: colorWhite,
  });

  const totStr = formatMoney(data.total, data.currency, isKobo);
  const totWidth = fontBold.widthOfTextAtSize(totStr, 12);
  page.drawText(totStr, {
    x: breakdownValueRight - totWidth,
    y: cursorY - 5,
    size: 12,
    font: fontBold,
    color: colorWhite,
  });

  // Diagonal Watermark for Test or Void
  if (data.isVoid) {
    page.drawText("VOID / REFUNDED", {
      x: 100,
      y: 350,
      size: 48,
      font: fontBold,
      color: rgb(0.95, 0.8, 0.8),
      rotate: degrees(35),
    });
  } else if (data.isTest) {
    page.drawText("TEST TRANSACTION", {
      x: 90,
      y: 350,
      size: 46,
      font: fontBold,
      color: rgb(0.93, 0.88, 0.78),
      rotate: degrees(35),
    });
  }

  cursorY -= 44;

  // 6. Verification and Authenticity Section (Footer)
  page.drawLine({
    start: { x: 44, y: 140 },
    end: { x: width - 44, y: 140 },
    color: colorLine,
    thickness: 1,
  });

  // Embed QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
      margin: 1,
      width: 160,
      color: { dark: "#141417", light: "#ffffff" },
    });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"));
    page.drawImage(qrImage, {
      x: 44,
      y: 50,
      width: 75,
      height: 75,
    });
  } catch (err) {
    console.error("QR Code embed failed:", err);
  }

  const verX = 130;
  const auditTitle = data.isTest
    ? "SIMULATED TEST VERIFICATION & AUDIT RECORD"
    : "DIGITAL VERIFICATION & AUDIT TRAIL";

  page.drawText(auditTitle, {
    x: verX,
    y: 115,
    size: 9,
    font: fontBold,
    color: data.isTest ? colorAmber : colorInk,
  });

  page.drawText("Scan the QR code or visit the secure URL below to verify this official receipt:", {
    x: verX,
    y: 101,
    size: 8.5,
    font: fontRegular,
    color: colorMuted,
  });

  page.drawText(data.verificationUrl, {
    x: verX,
    y: 87,
    size: 8.5,
    font: fontBold,
    color: rgb(0.1, 0.35, 0.75),
  });

  const footerCert = data.isTest
    ? "Simulated test transaction generated in test environment. Not an authentic legal proof of payment."
    : "Certified payment document issued via Rela for approved merchant storefronts.";

  page.drawText(footerCert, {
    x: verX,
    y: 65,
    size: 7.5,
    font: fontOblique,
    color: colorMuted,
  });

  return await pdfDoc.save();
}
