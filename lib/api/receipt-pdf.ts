import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  discount?: number;
  tax?: number;
  currency: string;
  total: number;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentStatus: string;
  purchaseDate: string;
  verificationUrl: string;
};

function formatMoney(amount: number, currency: string): string {
  const code = (currency || "NGN").toUpperCase();
  const formatted = Number(amount || 0).toLocaleString("en-US", {
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
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 (595.28 x 841.89 points)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorInk = rgb(0.08, 0.08, 0.09); // #141417
  const colorMuted = rgb(0.42, 0.44, 0.48); // #6b707a
  const colorLine = rgb(0.88, 0.89, 0.91); // #e1e3e8
  const colorBgSoft = rgb(0.96, 0.96, 0.97); // #f5f5f7
  const colorGreen = rgb(0.09, 0.55, 0.28); // #168c47
  const colorGreenBg = rgb(0.91, 0.97, 0.93); // #e8f7ee
  const colorWhite = rgb(1, 1, 1);

  let cursorY = height - 44;

  // 1. Top Bar / Header
  // Brand badge
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

  page.drawText("OFFICIAL PAYMENT RECEIPT", {
    x: 114,
    y: cursorY + 2,
    size: 9.5,
    font: fontBold,
    color: colorMuted,
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

  // 2. Status Banner (Paid in full badge)
  const statusUpper = (data.paymentStatus || "PAID").toUpperCase();
  page.drawRectangle({
    x: 44,
    y: cursorY - 24,
    width: width - 88,
    height: 32,
    color: colorGreenBg,
    borderColor: rgb(0.72, 0.88, 0.77),
    borderWidth: 1,
  });

  page.drawText(`STATUS: ${statusUpper}`, {
    x: 58,
    y: cursorY - 13,
    size: 10,
    font: fontBold,
    color: colorGreen,
  });

  const refInfo = [
    data.orderNumber ? `Order: ${data.orderNumber}` : null,
    data.paymentMethod ? `Method: ${data.paymentMethod.replace(/_/g, " ").toUpperCase()}` : null,
    data.paymentReference ? `Ref: ${data.paymentReference}` : null,
  ].filter(Boolean).join("  |  ");

  if (refInfo) {
    const refWidth = fontRegular.widthOfTextAtSize(refInfo, 8.5);
    page.drawText(refInfo, {
      x: width - 58 - refWidth,
      y: cursorY - 13,
      size: 8.5,
      font: fontRegular,
      color: colorGreen,
    });
  }

  cursorY -= 48;

  // 3. Parties Section: Two Columns (Business vs Customer)
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

  // Right Column: Customer (use top of parties section)
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

  // 4. Items Table
  // Table Header Background
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

    // Item name
    page.drawText(item.name || "Item", {
      x: 52,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: colorInk,
    });

    // Quantity
    page.drawText(String(item.quantity), {
      x: 324,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: colorInk,
    });

    // Unit Price
    const upStr = formatMoney(item.unit_price, data.currency);
    page.drawText(upStr, {
      x: 375,
      y: cursorY,
      size: 9,
      font: fontRegular,
      color: colorInk,
    });

    // Line Amount
    const laStr = formatMoney(lineTotal, data.currency);
    const laWidth = fontBold.widthOfTextAtSize(laStr, 9.5);
    page.drawText(laStr, {
      x: width - 52 - laWidth,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: colorInk,
    });

    cursorY -= 12;

    // Item details: description, size, colour
    const details = [];
    if (item.description) details.push(item.description);
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

    // Row separator
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

  // 5. Charges / Fees / Breakdown (Delivery, discount, tax, total)
  const breakdownLabelX = 330;
  const breakdownValueRight = width - 52;

  // Subtotal line
  page.drawText("Subtotal", {
    x: breakdownLabelX,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: colorMuted,
  });
  const subStr = formatMoney(subtotal, data.currency);
  const subWidth = fontRegular.widthOfTextAtSize(subStr, 9);
  page.drawText(subStr, {
    x: breakdownValueRight - subWidth,
    y: cursorY,
    size: 9,
    font: fontRegular,
    color: colorInk,
  });
  cursorY -= 15;

  // Charges (e.g. Delivery)
  if (data.charges && data.charges.length > 0) {
    for (const charge of data.charges) {
      page.drawText(charge.name || "Delivery Charge", {
        x: breakdownLabelX,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: colorMuted,
      });
      const chgStr = formatMoney(charge.amount, data.currency);
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
    const discStr = `-${formatMoney(data.discount, data.currency)}`;
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
    const taxStr = formatMoney(data.tax, data.currency);
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

  const totStr = formatMoney(data.total, data.currency);
  const totWidth = fontBold.widthOfTextAtSize(totStr, 12);
  page.drawText(totStr, {
    x: breakdownValueRight - totWidth,
    y: cursorY - 5,
    size: 12,
    font: fontBold,
    color: colorWhite,
  });

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
  page.drawText("DIGITAL VERIFICATION & AUDIT TRAIL", {
    x: verX,
    y: 115,
    size: 9,
    font: fontBold,
    color: colorInk,
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
    color: rgb(0.1, 0.35, 0.75), // subtle link color
  });

  page.drawText("Certified payment document issued via Rela for approved merchant storefronts.", {
    x: verX,
    y: 65,
    size: 7.5,
    font: fontOblique,
    color: colorMuted,
  });

  return await pdfDoc.save();
}
