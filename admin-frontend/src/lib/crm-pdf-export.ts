/**
 * PDF & Dossier Export Engine for QuickPress Enterprise CRM.
 * Generates an official executive audit dossier formatted for direct printing and "Save as PDF".
 */

export function exportRawJsonData(fileName: string, data: any) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_full_dossier.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export JSON failed:", err);
  }
}

export function exportCsvData(fileName: string, rows: Record<string, any>[]) {
  try {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_orders_history.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export CSV failed:", err);
  }
}

export function exportCrmProfilePdf(entityType: string, profileData: any) {
  const p = profileData || {};
  const isCustomer = entityType === "customer";
  const isRider = entityType === "rider";
  const isPartner = entityType === "partner";

  const entityTitle = isCustomer
    ? "CUSTOMER 360° EXECUTIVE DOSSIER"
    : isRider
    ? "PILOT / RIDER 360° SERVICE DOSSIER"
    : "PARTNER STORE / MERCHANT AUDIT DOSSIER";

  const entityName =
    p.name ||
    p.storeName ||
    p.display_name ||
    p.fullName ||
    (isCustomer ? "QuickPress Customer" : isRider ? "Captain Pilot" : "Merchant Hub");

  const entityId = p.id || p._id || "QP-" + Math.floor(100000 + Math.random() * 900000);
  const phone = p.phone || "—";
  const email = p.email || "—";
  const city = p.city || "Kasganj";
  const state = p.state || "Uttar Pradesh";
  const status = p.status || (isRider ? p.live || "Online" : "Active");
  const joinedDate = (p.joined || p.createdAt || p.registrationTimestamp || new Date().toISOString()).slice(0, 10);
  const printTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  // Orders list
  const orders = Array.isArray(p.ordersList)
    ? p.ordersList
    : Array.isArray(p.tripsList)
    ? p.tripsList
    : Array.isArray(p.orders)
    ? p.orders
    : [];

  const ordersRowsHtml = orders.slice(0, 25).map((o: any, idx: number) => {
    const oId = o.code || o.orderCode || o.id || `ORD-${idx + 1}`;
    const date = (o.date || o.createdAt || o.placedAt || "—").slice(0, 19).replace("T", " ");
    const amount = typeof o.amount === "number" ? o.amount : (o.totals?.grandTotal || o.earning || 0);
    const st = o.status || "Completed";
    const service = o.serviceLabel || o.service?.name || o.service || "Standard Wash & Iron";

    return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7; font-family: monospace; font-weight: bold; color: #18181b;">#${oId}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7; color: #52525b;">${date}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7; color: #18181b;">${service}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: bold; color: #047857;">₹${Number(amount).toLocaleString("en-IN")}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e4e4e7; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: #ecfdf5; color: #065f46; text-transform: uppercase;">${st}</span>
        </td>
      </tr>
    `;
  }).join("");

  // Addresses
  const addresses = Array.isArray(p.addresses) ? p.addresses : [];
  const addressHtml = addresses.map((a: any) => `
    <div style="background: #f4f4f5; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px; font-size: 12px;">
      <strong style="color: #18181b;">${a.type || "Primary"}:</strong> ${a.fullAddress || a.addressLine || ""}
      <div style="color: #71717a; margin-top: 2px;">City: ${a.city || city} | Pincode: ${a.pincode || "—"}</div>
    </div>
  `).join("");

  // Bank Info
  const bank = p.bankDetails || p.bank || {};
  const vehicle = p.vehicleDetails || p.vehicle || {};

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${entityTitle} — ${entityName} (${entityId})</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #09090b; margin: 0; padding: 0; font-size: 13px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #059669; }
        .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #065f46; }
        .badge { background: #059669; color: white; padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 4px; display: inline-block; }
        .doc-meta { text-align: right; font-size: 11px; color: #71717a; }
        .profile-card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin-top: 16px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
        .kpi-box { background: white; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; }
        .kpi-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #71717a; letter-spacing: 0.5px; }
        .kpi-val { font-size: 18px; font-weight: 800; color: #18181b; margin-top: 4px; }
        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #27272a; margin: 24px 0 10px; letter-spacing: 0.3px; border-left: 4px solid #059669; padding-left: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        th { background: #f4f4f5; color: #52525b; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #e4e4e7; }
        .footer { margin-top: 40px; padding-top: 14px; border-top: 1px dashed #d4d4d8; font-size: 11px; color: #71717a; display: flex; justify-content: space-between; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">QUICKPRESS OPERATIONS AUDIT</div>
          <div class="badge">${entityTitle}</div>
        </div>
        <div class="doc-meta">
          <div><strong>Dossier Ref:</strong> QP-CRM-${entityId.slice(0, 8).toUpperCase()}</div>
          <div><strong>Generated:</strong> ${printTimestamp}</div>
          <div><strong>Authority:</strong> Super Admin Audit Access</div>
        </div>
      </div>

      <div class="profile-card">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #18181b;">${entityName}</h2>
            <div style="font-size: 12px; color: #52525b; margin-top: 3px;">
              System Identifier: <strong>${entityId}</strong> · Region: <strong>${city}, ${state}</strong>
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 12px;">
            ● STATUS: ${status.toUpperCase()}
          </div>
        </div>

        <div class="grid-2">
          <div><strong>Phone Contact:</strong> ${phone}</div>
          <div><strong>Email Address:</strong> ${email}</div>
          <div><strong>Primary Territory:</strong> ${city} (${state})</div>
          <div><strong>Account Registered:</strong> ${joinedDate}</div>
        </div>
      </div>

      <div class="grid-4">
        <div class="kpi-box">
          <div class="kpi-label">${isCustomer ? "Total Orders" : isRider ? "Deliveries Done" : "Orders Fulfilled"}</div>
          <div class="kpi-val">${p.ordersCount || p.totalOrders || p.completedOrders || p.trips || orders.length || 0}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">${isCustomer ? "Lifetime Spend" : isRider ? "Total Earnings" : "Gross GMV"}</div>
          <div class="kpi-val" style="color: #047857;">₹${Number(p.spend || p.totalEarnings || p.gmv || p.totalRevenue || 0).toLocaleString("en-IN")}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">${isRider ? "COD Cash Held" : "Wallet Balance"}</div>
          <div class="kpi-val">₹${Number(p.codCash || p.walletBalance || p.wallet || 0).toLocaleString("en-IN")}</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-label">Performance / Rating</div>
          <div class="kpi-val">${p.rating ? p.rating + " ★" : p.membership || "Standard VIP"}</div>
        </div>
      </div>

      ${isRider ? `
        <div class="section-title">Fleet & Vehicle Specifications</div>
        <div class="profile-card" style="margin-top: 8px;">
          <div class="grid-2">
            <div><strong>Vehicle Category:</strong> ${p.vehicleType || vehicle.type || "Bike / Two Wheeler"}</div>
            <div><strong>Registration Plate:</strong> ${p.vehicleNumber || vehicle.plate || "UP-87-AB-1234"}</div>
            <div><strong>Driving License:</strong> ${p.dlNumber || "VERIFIED"}</div>
            <div><strong>Live Shift Status:</strong> ${status}</div>
          </div>
        </div>
      ` : ""}

      ${(bank.bankName || bank.accountNumber || p.bankName) ? `
        <div class="section-title">Verified Banking Rails</div>
        <div class="profile-card" style="margin-top: 8px;">
          <div class="grid-2">
            <div><strong>Bank Name:</strong> ${bank.bankName || p.bankName || "—"}</div>
            <div><strong>Account Number:</strong> ${bank.accountNumber || (p.accountLast4 ? "•••• " + p.accountLast4 : "—")}</div>
            <div><strong>IFSC Code:</strong> ${bank.ifsc || p.ifsc || "—"}</div>
            <div><strong>UPI ID:</strong> ${bank.upiId || p.upiId || "—"}</div>
          </div>
        </div>
      ` : ""}

      ${addresses.length > 0 ? `
        <div class="section-title">Verified Addresses & Geofence</div>
        ${addressHtml}
      ` : ""}

      <div class="section-title">Order Lifecycle & Activity History (${orders.length} Records)</div>
      ${orders.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Placed / Updated</th>
              <th>Service / Description</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${ordersRowsHtml}
          </tbody>
        </table>
      ` : `
        <div style="padding: 16px; background: #fafafa; border: 1px dashed #d4d4d8; text-align: center; border-radius: 8px; color: #71717a;">
          No past orders logged for this entity.
        </div>
      `}

      <div class="footer">
        <div>QuickPress Technologies Private Limited · Operations Intelligence Console</div>
        <div>Confidential Internal Document · Page 1 of 1</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

export function exportLeaderboardPdf(data: any, timeframe: string, geoFilter: string) {
  const partners = data?.partners || [];
  const riders = data?.riders || [];
  const customers = data?.customers || [];
  const printTimestamp = new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "medium" });

  const partnerRows = partners.slice(0, 10).map((p: any) => `
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; text-align: center;">#${p.rank}</td>
      <td style="padding: 6px 10px; font-weight: 700;">${p.name}</td>
      <td style="padding: 6px 10px; color: #71717a;">${p.city}</td>
      <td style="padding: 6px 10px; text-align: center;">${p.rating || 4.9} ★</td>
      <td style="padding: 6px 10px; text-align: center;">${p.orders}</td>
      <td style="padding: 6px 10px; text-align: right; font-weight: bold; color: #047857;">₹${Number(p.gmv).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  const riderRows = riders.slice(0, 10).map((r: any) => `
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; text-align: center;">#${r.rank}</td>
      <td style="padding: 6px 10px; font-weight: 700;">${r.name}</td>
      <td style="padding: 6px 10px; color: #71717a;">${r.city}</td>
      <td style="padding: 6px 10px; text-align: center;">${r.rating || 4.8} ★</td>
      <td style="padding: 6px 10px; text-align: center;">${r.deliveries}</td>
      <td style="padding: 6px 10px; text-align: right; font-weight: bold; color: #047857;">₹${Number(r.earnings).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  const customerRows = customers.slice(0, 10).map((c: any) => `
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; text-align: center;">#${c.rank}</td>
      <td style="padding: 6px 10px; font-weight: 700;">${c.name}</td>
      <td style="padding: 6px 10px; color: #71717a;">${c.city}</td>
      <td style="padding: 6px 10px; text-align: center;">${c.membership}</td>
      <td style="padding: 6px 10px; text-align: center;">${c.orders}</td>
      <td style="padding: 6px 10px; text-align: right; font-weight: bold; color: #047857;">₹${Number(c.spend).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>QuickPress Geo Leaderboard Report — ${geoFilter}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #18181b; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
        h1 { margin: 0; font-size: 20px; color: #065f46; }
        .meta { text-align: right; font-size: 11px; color: #71717a; }
        h2 { font-size: 14px; margin: 18px 0 8px; border-left: 3px solid #059669; padding-left: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f4f4f5; text-align: left; padding: 6px 10px; border-bottom: 2px solid #e4e4e7; font-size: 11px; }
        td { border-bottom: 1px solid #e4e4e7; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>QUICKPRESS GEO LEADERBOARD</h1>
          <div style="font-size: 12px; font-weight: bold; color: #047857; margin-top: 4px;">Zone: ${geoFilter} · Timeframe: ${timeframe.toUpperCase()}</div>
        </div>
        <div class="meta">
          <div>Generated: ${printTimestamp}</div>
          <div>Official Platform Performance Audit</div>
        </div>
      </div>

      <h2>Top Merchant Partners (by GMV & Volume)</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Rank</th>
            <th>Store / Partner</th>
            <th>City</th>
            <th style="text-align: center;">Rating</th>
            <th style="text-align: center;">Orders</th>
            <th style="text-align: right;">Total Sales (GMV)</th>
          </tr>
        </thead>
        <tbody>${partnerRows}</tbody>
      </table>

      <h2>Top Delivery Captains / Riders (by Fulfilled Orders)</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Rank</th>
            <th>Pilot Name</th>
            <th>City</th>
            <th style="text-align: center;">Rating</th>
            <th style="text-align: center;">Deliveries</th>
            <th style="text-align: right;">Total Earnings</th>
          </tr>
        </thead>
        <tbody>${riderRows}</tbody>
      </table>

      <h2>Top Valued Customers (by Lifetime Spend)</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Rank</th>
            <th>Customer</th>
            <th>City</th>
            <th style="text-align: center;">Tier</th>
            <th style="text-align: center;">Orders</th>
            <th style="text-align: right;">Total Spend</th>
          </tr>
        </thead>
        <tbody>${customerRows}</tbody>
      </table>

      <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #a1a1aa; border-top: 1px solid #e4e4e7; padding-top: 10px;">
        QuickPress Automated Performance Metric Engine · Real-time Database Snapshot
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
}
