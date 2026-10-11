/**
 * QuickPress Partner - 58mm / 80mm ESC/POS Thermal Receipt & Laundry Bag Tag Printing Utility.
 * Supports direct browser window.print() via isolated iframe with dedicated @media print thermal styles.
 */

export interface ThermalPrintOrderData {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  placedAt?: string;
  amount: number;
  paymentMode?: string;
  paymentStatus?: string;
  items?: { name: string; qty: number; price?: number; service?: string }[];
  itemCount?: number;
  services?: string[];
  pickupAddress?: string;
  specialInstructions?: string;
}

export function printThermalOrderTag(order: ThermalPrintOrderData): void {
  if (typeof window === "undefined") return;

  const orderCode = order.code.startsWith("#") ? order.code : `#${order.code}`;
  const nowStr = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const items = order.items && order.items.length > 0
    ? order.items
    : [{ name: order.services?.join(", ") || "Standard Laundry Care", qty: order.itemCount || 1, price: order.amount }];

  const totalPieces = items.reduce((acc, curr) => acc + (curr.qty || 1), 0);
  const paymentBadge = order.paymentMode === "cod" ? "COLLECT CASH" : "PAID (ONLINE)";

  // Format thermal HTML
  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Laundry Bag Tag - ${orderCode}</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        @media print {
          body {
            margin: 0;
            padding: 8px 6px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: 58mm;
          }
        }
        body {
          margin: 0 auto;
          padding: 10px;
          font-family: monospace;
          font-size: 12px;
          color: #000;
          background: #fff;
          max-width: 58mm;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-black { font-weight: 900; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        .big-code {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1px;
          margin: 4px 0;
        }
        .tag-title {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .barcode {
          margin: 8px auto;
          text-align: center;
          font-family: monospace;
          letter-spacing: 4px;
          font-size: 14px;
          font-weight: 900;
          border-top: 3px solid #000;
          border-bottom: 3px solid #000;
          padding: 4px 0;
        }
        .bag-sticker-notice {
          border: 1.5px solid #000;
          padding: 4px;
          text-align: center;
          font-size: 10px;
          font-weight: 900;
          margin: 6px 0;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <div class="tag-title">⚡ QUICKPRESS LAUNDRY ⚡</div>
        <div style="font-size: 10px;">GARMENT CARE & BAG TAG</div>
        <div class="double-divider"></div>
        <div style="font-size: 9px;">ORDER ID</div>
        <div class="big-code">${orderCode}</div>
        <div class="barcode">||| | | |||| | ||| | ||</div>
      </div>

      <div class="divider"></div>

      <div class="row">
        <span>Date:</span>
        <span class="font-bold">${nowStr}</span>
      </div>
      <div class="row">
        <span>Customer:</span>
        <span class="font-bold">${order.customerName}</span>
      </div>
      ${order.customerPhone ? `
      <div class="row">
        <span>Phone:</span>
        <span class="font-bold">${order.customerPhone}</span>
      </div>` : ""}

      <div class="double-divider"></div>
      <div class="font-black" style="font-size: 11px;">GARMENTS BREAKDOWN:</div>
      <div class="divider"></div>

      ${items.map((it) => `
        <div class="row" style="margin: 3px 0;">
          <span class="font-bold">${it.qty || 1}x ${it.name}</span>
          <span>₹${(it.qty || 1) * (it.price || 0)}</span>
        </div>
      `).join("")}

      <div class="divider"></div>

      <div class="row font-black">
        <span>TOTAL PIECES:</span>
        <span>${totalPieces} CLOTHES</span>
      </div>
      <div class="row font-black" style="font-size: 13px; margin-top: 4px;">
        <span>TOTAL BILL:</span>
        <span>₹${order.amount}</span>
      </div>
      <div class="row font-bold" style="font-size: 10px;">
        <span>PAYMENT:</span>
        <span>${paymentBadge}</span>
      </div>

      ${order.specialInstructions ? `
      <div class="divider"></div>
      <div style="font-size: 9px;">
        <strong>NOTE:</strong> ${order.specialInstructions}
      </div>` : ""}

      <div class="bag-sticker-notice">
        STAPLE OR ATTACH THIS TAG TO LAUNDRY BAG
      </div>

      <div class="text-center" style="font-size: 9px; margin-top: 6px;">
        Thank You for choosing QuickPress!
        <br/>www.quickpress.in
      </div>
    </body>
    </html>
  `;

  // Use hidden iframe for seamless instant printing
  let iframe = document.getElementById("qp-thermal-print-frame") as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "qp-thermal-print-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }
}
