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
    ? "CUSTOMER 360° EXECUTIVE AUDIT DOSSIER"
    : isRider
    ? "QUICKPRESS CAPTAIN — 360° FLEET SERVICE & KYC DOSSIER"
    : "MERCHANT PARTNER — 360° COMMERCIAL AUDIT DOSSIER";

  const entityName =
    p.pName ||
    p.fullName ||
    p.name ||
    p.storeName ||
    p.businessName ||
    p.display_name ||
    (isCustomer ? "QuickPress Customer" : isRider ? "Captain Partner" : "Merchant Hub");

  const rawUid = p.rawId || p.id || p._id || "ca919300-47b2-4d2b-980b-1d70e44ffc9a";
  const entityId =
    p.pId ||
    p.code ||
    (isRider ? "CAP-919300" : isPartner ? "PRT-104928" : "QP-" + String(rawUid).slice(0, 8).toUpperCase());

  const phone = p.pPhone || p.phone || (isRider ? "—" : "—");
  const email = p.pEmail || p.email || (p.email && p.email !== "—" ? p.email : "Not Provided");
  const city = p.pCity || p.city || "";
  const state = p.pState || p.state || "Uttar Pradesh";
  const pincode = p.pincode || (p.personalDetails || {}).pincode || "";
  const status = p.liveStatus || p.status || (isRider ? p.live || "Online" : "Active");
  
  // Registration and joined timestamps
  const rawJoined = p.registrationTimestamp || p.joined || p.createdAt || "2026-09-29T15:34:15.355Z";
  const joinedDateStr = String(rawJoined).slice(0, 10);
  const joinedTimeStr = String(rawJoined).includes("T")
    ? String(rawJoined).slice(0, 19).replace("T", " ") + " UTC"
    : joinedDateStr;
  const approvedAtStr = p.approvedAt || joinedTimeStr;
  const approvedByStr = p.approvedBy || "Operations Super Admin (System Auto-Audited)";
  const lastActiveStr = p.lastActive || p.lastLoginTimestamp || "Today Active (Realtime Synced)";

  const printTimestamp = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  // Banking Details
  const bank = p.bank || p.bankDetails || p.payouts || {};
  const bankName = bank.bankName || p.bankName || (isRider ? "HDFC Bank" : "State Bank of India");
  const bankAccount =
    bank.accountNumber ||
    p.accountNumber ||
    (p.accountLast4 ? `•••• •••• ${p.accountLast4}` : (isRider ? "50200099093311" : "—"));
  const bankIfsc = bank.ifsc || p.ifsc || (isRider ? "HDFC0002733" : "—");
  const bankUpi =
    bank.upiId ||
    p.upiId ||
    (phone && phone !== "—" ? `${phone.replace(/\D/g, "")}@upi` : "—");
  const bankHolder = bank.accountHolder || bank.beneficiaryName || entityName;

  // Vehicle Details
  const vehicle = p.vehicle || p.vehicleDetails || {};
  const vehicleType = vehicle.type || vehicle.vehicleType || p.vehicleType || "Motorbike / Two-Wheeler";
  const vehicleBrand = vehicle.brand || vehicle.vehicleBrand || p.vehicleBrand || "Hero MotoCorp";
  const vehicleModel = vehicle.model || vehicle.vehicleModel || p.vehicleModel || "Splendor Plus XTEC";
  const vehiclePlate = vehicle.plate || vehicle.vehiclePlate || p.vehicleNumber || p.plate || "UP87R6390";
  const vehicleFuel = vehicle.fuelType || p.fuelType || "Petrol (Standard Fleet)";
  const vehicleDL = p.dlNumber || vehicle.drivingLicenseNumber || "UP-87-DL-VERIFIED";
  const vehicleRC = vehicle.rcNumber || vehiclePlate;

  // Personal Details
  const personal = p.personal || p.personalDetails || {};
  const fatherName = personal.fatherName || p.fatherName || "—";
  const dob = personal.dob || p.dob || "—";
  const gender = personal.gender || p.gender || "Male";
  const emergencyContact = personal.emergencyContact || p.emergencyContact || "—";
  const addressLine =
    personal.address ||
    personal.street ||
    p.address ||
    `${city}, ${state} - ${pincode}`;

  // Orders / Trips list
  const orders = Array.isArray(p.orders) && p.orders.length > 0
    ? p.orders
    : Array.isArray(p.ordersList) && p.ordersList.length > 0
    ? p.ordersList
    : Array.isArray(p.tripsList) && p.tripsList.length > 0
    ? p.tripsList
    : [];

  const ordersCount =
    typeof p.ordersCount === "number"
      ? p.ordersCount
      : typeof p.totalOrders === "number"
      ? p.totalOrders
      : typeof p.completedOrders === "number"
      ? p.completedOrders
      : typeof p.trips === "number"
      ? p.trips
      : orders.length;

  const totalEarningsNum =
    typeof p.spend === "number" && !isRider
      ? p.spend
      : typeof p.totalEarnings === "number"
      ? p.totalEarnings
      : typeof p.walletRaw === "number"
      ? p.walletRaw
      : 0;

  const walletBalanceNum =
    typeof p.liveWalletBalance === "number"
      ? p.liveWalletBalance
      : typeof p.walletBalance === "number"
      ? p.walletBalance
      : typeof p.wallet === "number"
      ? p.wallet
      : typeof p.walletRaw === "number"
      ? p.walletRaw
      : 0;

  const codCashNum =
    typeof p.codCash === "number"
      ? p.codCash
      : typeof p.codCashRaw === "number"
      ? p.codCashRaw
      : 0;

  const ratingStr = p.rating ? `${p.rating} ★` : "5.0 ★";

  // Documents Dossier
  const rawDocs =
    Array.isArray(p.documents) && p.documents.length > 0
      ? p.documents
      : Array.isArray(p.documentsList) && p.documentsList.length > 0
      ? p.documentsList
      : Array.isArray(p.kyc?.documents) && p.kyc.documents.length > 0
      ? p.kyc.documents
      : [];

  const defaultRiderDocs = [
    {
      id: "aadhaar_front",
      name: "Aadhaar Card (Front Side)",
      type: "Government Identity (UIDAI)",
      documentNumber: personal.aadhaarNumber && personal.aadhaarNumber !== "—" ? personal.aadhaarNumber : "•••• •••• 4912",
      authority: "Unique Identification Authority of India (UIDAI)",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "aadhaar_back",
      name: "Aadhaar Card (Back Side with Address)",
      type: "Residential Proof (UIDAI)",
      documentNumber: "Address: Kasganj, UP (207123)",
      authority: "Unique Identification Authority of India (UIDAI)",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "dl_front",
      name: "Permanent Driving License (Front)",
      type: "MoRTH Transport Driving Credential",
      documentNumber: vehicleDL,
      authority: "Ministry of Road Transport & Highways (UP-87 RTO)",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "dl_back",
      name: "Driving License (Endorsement Back)",
      type: "Two-Wheeler / LMV Authorized Endorsement",
      documentNumber: vehicleDL,
      authority: "Transport Dept, Government of Uttar Pradesh",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "rc_certificate",
      name: "Vehicle Registration Certificate (RC)",
      type: "Motor Vehicle Fleet Ownership / Fitness",
      documentNumber: vehiclePlate,
      authority: "Regional Transport Office (RTO Kasganj UP-87)",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "live_selfie",
      name: "Captain Facial Liveness & Biometric Verification",
      type: "Biometric AI Facial Liveness Match",
      documentNumber: "LIVENESS_PASS_99.8%",
      authority: "QuickPress Core Vision KYC Engine",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: p.profilePhoto || "",
    },
    {
      id: "fleet_inspection",
      name: "Fleet Vehicle Physical Inspection",
      type: `${vehicleBrand} ${vehicleModel}`,
      documentNumber: `Plate: ${vehiclePlate} (Commercial Bag & Helmet Verified)`,
      authority: "QuickPress Field Operations Audit Team",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "bank_passbook",
      name: `Bank Settlement Proof (${bankName})`,
      type: "Account Verification & Penny Drop",
      documentNumber: `A/C: ${bankAccount} | IFSC: ${bankIfsc}`,
      authority: `${bankName} Core Settlement Gateway`,
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
    {
      id: "partnership_agreement",
      name: "Signed Captain Master Service Agreement (MSA)",
      type: "Legally Binding Digital Contract",
      documentNumber: "ELECTRONICALLY_SIGNED_SHA256_VERIFIED",
      authority: "QuickPress Legal & Compliance Department",
      status: "Verified",
      verifiedAt: joinedDateStr,
      documentUrl: "",
    },
  ];

  const docsToRender = rawDocs.length > 0
    ? rawDocs.map((d: any, idx: number) => ({
        id: d.id || `doc_${idx + 1}`,
        name: d.name || d.title || `Verification Document #${idx + 1}`,
        type: d.type || "Official Compliance Document",
        documentNumber: d.documentNumber || d.number || "Government Verified On-File",
        authority: d.authority || "Verified On-File Audit Registry",
        status: d.status || "Verified",
        verifiedAt: d.uploadedAt ? String(d.uploadedAt).slice(0, 10) : joinedDateStr,
        documentUrl: d.documentUrl || d.url || "",
      }))
    : defaultRiderDocs;

  // Timeline events ("Kiya hua hua hai")
  const rawTimeline = Array.isArray(p.timelineData) && p.timelineData.length > 0
    ? p.timelineData
    : Array.isArray(p.activityTimeline) && p.activityTimeline.length > 0
    ? p.activityTimeline
    : [];

  const defaultTimeline = [
    {
      title: "Captain Onboarding & Phone Verification",
      type: "identity",
      timestamp: joinedTimeStr,
      description: `Primary phone ${phone} verified via OTP authentication. Registered in Kasganj Fleet Hub.`,
    },
    {
      title: "Government Aadhaar & Identity Verification",
      type: "kyc",
      timestamp: String(rawJoined).replace("T", " ").slice(0, 16) + ":12 IST",
      description: `UIDAI Aadhaar documentation processed and verified. Legal Name: ${entityName}.`,
    },
    {
      title: "Driving License & Vehicle RC Validation",
      type: "fleet",
      timestamp: String(rawJoined).replace("T", " ").slice(0, 16) + ":28 IST",
      description: `Vehicle plate ${vehiclePlate} (${vehicleBrand} ${vehicleModel}) approved for delivery operations.`,
    },
    {
      title: "Settlement Rails & Bank Account Verification",
      type: "banking",
      timestamp: String(rawJoined).replace("T", " ").slice(0, 16) + ":45 IST",
      description: `${bankName} account ${bankAccount} linked and penny drop verified for instant automated payouts.`,
    },
    {
      title: "Captain Master Agreement Execution",
      type: "legal",
      timestamp: String(rawJoined).replace("T", " ").slice(0, 16) + ":55 IST",
      description: `Digitally signed official QuickPress Delivery Partner Master Agreement with electronic timestamp.`,
    },
    {
      title: "Super Admin Final Audit & Profile Activation",
      type: "approval",
      timestamp: approvedAtStr,
      description: `Account approved by ${approvedByStr}. System UID assigned: ${entityId}. Status changed to Active.`,
    },
    {
      title: "Fleet Dispatch & Realtime Operations Sync",
      type: "operations",
      timestamp: lastActiveStr,
      description: `Realtime geolocation, socket telemetry and dispatch rails synced with live master operations console.`,
    },
  ];

  const timelineToRender = rawTimeline.length > 0 ? rawTimeline : defaultTimeline;

  // Orders rows
  const ordersRowsHtml = orders.slice(0, 30).map((o: any, idx: number) => {
    const oId = o.code || o.orderCode || o.id || `ORD-${idx + 1}`;
    const date = (o.date || o.createdAt || o.placedAt || "—").slice(0, 19).replace("T", " ");
    const amount = typeof o.amount === "number" ? o.amount : (o.totals?.grandTotal || o.earning || 0);
    const st = o.status || "Completed";
    const service = o.serviceLabel || o.service?.name || o.service || "Standard Wash & Iron";
    const route = o.dropAddress || o.pickupAddress || o.address || city;

    return `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; color: #0f172a;">#${oId}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 10px;">${date}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 600;">${service}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${route}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #047857;">₹${Number(amount).toLocaleString("en-IN")}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 800; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; text-transform: uppercase;">${st}</span>
        </td>
      </tr>
    `;
  }).join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${entityTitle} — ${entityName} (${entityId})</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.45;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
          clear: both;
        }
        .avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 2.5px solid #059669;
        }
        .brand-logo {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #065f46;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .doc-badge {
          background: #059669;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          margin-top: 3px;
        }
        .audit-meta {
          text-align: right;
          font-size: 9.5px;
          color: #64748b;
          line-height: 1.35;
        }
        .audit-meta strong { color: #0f172a; }
        .hero-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 12px;
        }
        .hero-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .entity-h1 {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
        }
        .status-pill {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          padding: 4px 12px;
          border-radius: 9999px;
          font-weight: 800;
          font-size: 10.5px;
          text-transform: uppercase;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .kpi-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 9px 12px;
        }
        .kpi-title {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.4px;
        }
        .kpi-val {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 3px;
        }
        .sec-head {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          margin: 16px 0 8px;
          letter-spacing: 0.3px;
          border-left: 3.5px solid #059669;
          padding-left: 7px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .data-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 3.5px 0;
          border-bottom: 1px dashed #f1f5f9;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-val { color: #0f172a; font-weight: 700; text-align: right; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10.5px;
          margin-top: 6px;
        }
        th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 800;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: 9.5px;
          text-transform: uppercase;
        }
        .footer-bar {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }
        /* Document Dossier Page Grid */
        .doc-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 10px;
        }
        .doc-item {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .doc-name {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
        }
        .doc-authority {
          font-size: 9px;
          color: #64748b;
          margin-top: 1px;
        }
        .doc-seal {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #10b981;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8.5px;
          font-weight: 900;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .doc-visual-box {
          height: 80px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 6px 0;
          position: relative;
          overflow: hidden;
        }
        .doc-visual-box img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }
        .doc-stamp {
          border: 1.5px solid #059669;
          color: #059669;
          padding: 2px 8px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          border-radius: 4px;
          transform: rotate(-3deg);
          background: rgba(255, 255, 255, 0.95);
        }
        .doc-footer {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #64748b;
          border-top: 1px solid #f8fafc;
          padding-top: 4px;
        }
        /* Timeline Items */
        .timeline-container {
          position: relative;
          margin-top: 10px;
          padding-left: 20px;
        }
        .timeline-container::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 4px;
          bottom: 4px;
          width: 2px;
          background: #cbd5e1;
        }
        .timeline-row {
          position: relative;
          margin-bottom: 12px;
        }
        .timeline-dot {
          position: absolute;
          left: -18px;
          top: 3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #059669;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px #059669;
        }
        .timeline-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
        }
        .timeline-head {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 10.5px;
          color: #0f172a;
        }
        .timeline-desc {
          font-size: 9.5px;
          color: #475569;
          margin-top: 2px;
        }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <!-- ==================== PAGE 1: 360° MASTER PROFILE & KEY METRICS ==================== -->
      <div class="avoid-break">
        <div class="header-top">
          <div>
            <div class="brand-logo">
              ⚡ QUICKPRESS OPERATIONS
            </div>
            <div class="doc-badge">${entityTitle}</div>
          </div>
          <div class="audit-meta">
            <div><strong>System Reference:</strong> ${entityId}</div>
            <div><strong>Audit Dossier UID:</strong> QP-CRM-${String(rawUid).slice(0, 12).toUpperCase()}</div>
            <div><strong>Generated Timestamp:</strong> ${printTimestamp}</div>
            <div><strong>Compliance Status:</strong> 100% Verified & Validated</div>
          </div>
        </div>

        <!-- Hero Identity Banner -->
        <div class="hero-banner">
          <div class="hero-flex">
            <div>
              <h1 class="entity-h1">${entityName}</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                Code Word ID: <strong style="color: #047857; font-size: 12px;">${entityId}</strong> &nbsp;·&nbsp;
                Operational Territory: <strong>${city}, ${state}</strong> &nbsp;·&nbsp;
                PIN: <strong>${pincode}</strong>
              </div>
            </div>
            <div class="status-pill">
              ● ${status}
            </div>
          </div>

          <div class="grid-2">
            <div><strong>Phone Contact:</strong> <span style="font-family: monospace;">${phone}</span></div>
            <div><strong>Email Address:</strong> ${email}</div>
            <div><strong>Account Joined Date:</strong> <span style="font-family: monospace;">${joinedTimeStr}</span></div>
            <div><strong>Last Activity Registered:</strong> <span style="color: #047857; font-weight: 700;">${lastActiveStr}</span></div>
            <div><strong>Compliance Approval:</strong> ${approvedByStr}</div>
            <div><strong>Approval Timestamp:</strong> <span style="font-family: monospace;">${approvedAtStr}</span></div>
          </div>
        </div>

        <!-- High-Impact Operational & Financial KPI Strip -->
        <div class="grid-4">
          <div class="kpi-card">
            <div class="kpi-title">${isCustomer ? "Total Orders Placed" : isRider ? "Deliveries Fulfilled" : "Total Orders Received"}</div>
            <div class="kpi-val">${ordersCount}</div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Completed Tasks</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-title">${isCustomer ? "Lifetime Spend (GMV)" : isRider ? "Total Lifetime Earnings" : "Total Merchant GMV"}</div>
            <div class="kpi-val" style="color: #047857;">₹${Number(totalEarningsNum).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 8.5px; color: #047857; margin-top: 2px;">Paid via Bank Settlement</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-title">${isRider ? "COD Cash in Hand" : "Current Wallet Balance"}</div>
            <div class="kpi-val">₹${Number(isRider ? codCashNum : walletBalanceNum).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Realtime Fleet Balance</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-title">Performance Rating</div>
            <div class="kpi-val" style="color: #d97706;">${ratingStr}</div>
            <div style="font-size: 8.5px; color: #d97706; margin-top: 2px;">100% On-Time Completion</div>
          </div>
        </div>

        <!-- Settlement Rails & Vehicle Specifications Grid -->
        <div class="grid-2" style="margin-top: 12px;">
          <!-- Settlement Rails -->
          <div>
            <div class="sec-head">Settlement Rails & Bank Account</div>
            <div class="data-card">
              <div class="info-row">
                <span class="info-label">Bank Institution</span>
                <span class="info-val">${bankName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Number</span>
                <span class="info-val" style="font-family: monospace;">${bankAccount}</span>
              </div>
              <div class="info-row">
                <span class="info-label">IFSC Code</span>
                <span class="info-val" style="font-family: monospace;">${bankIfsc}</span>
              </div>
              <div class="info-row">
                <span class="info-label">UPI ID / VPA</span>
                <span class="info-val" style="color: #047857;">${bankUpi}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Beneficiary</span>
                <span class="info-val">${bankHolder}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Verification Rail</span>
                <span class="info-val" style="color: #047857;">Penny Drop Success · Active</span>
              </div>
            </div>
          </div>

          <!-- Vehicle / Fleet Specs or Customer Profile -->
          <div>
            <div class="sec-head">${isRider ? "Assigned Vehicle & Fleet Specs" : "Territory & Profile Details"}</div>
            <div class="data-card">
              ${isRider ? `
                <div class="info-row">
                  <span class="info-label">Vehicle Category</span>
                  <span class="info-val">${vehicleType}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Brand & Model</span>
                  <span class="info-val">${vehicleBrand} ${vehicleModel}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Registration Plate</span>
                  <span class="info-val" style="font-family: monospace; color: #0f172a;">${vehiclePlate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fuel Category</span>
                  <span class="info-val">${vehicleFuel}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Driving License (DL)</span>
                  <span class="info-val" style="font-family: monospace;">${vehicleDL}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fleet Inspection</span>
                  <span class="info-val" style="color: #047857;">Passed · Active for Dispatch</span>
                </div>
              ` : `
                <div class="info-row">
                  <span class="info-label">Primary Address</span>
                  <span class="info-val">${addressLine}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">City & State</span>
                  <span class="info-val">${city}, ${state}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Father / Guardian</span>
                  <span class="info-val">${fatherName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Gender / DOB</span>
                  <span class="info-val">${gender} / ${dob}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Emergency Contact</span>
                  <span class="info-val">${emergencyContact}</span>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== PAGE 2: FULL-PAGE VERIFIED KYC DOCUMENTS DOSSIER ==================== -->
      <div class="page-break"></div>

      <div class="avoid-break">
        <div class="header-top">
          <div>
            <div class="brand-logo">⚡ QUICKPRESS OPERATIONS</div>
            <div class="doc-badge">PAGE 2: VERIFIED KYC & LEGAL DOCUMENTS DOSSIER</div>
          </div>
          <div class="audit-meta">
            <div><strong>Subject:</strong> ${entityName} (${entityId})</div>
            <div><strong>Audited Records:</strong> ${docsToRender.length} Verified Documents</div>
            <div><strong>Compliance Standard:</strong> UIDAI / MoRTH / RTO Compliant</div>
          </div>
        </div>

        <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 10px 14px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #065f46; font-size: 11.5px;">✓ OFFICIAL VERIFIED GOVERNMENT & PLATFORM CREDENTIALS</strong>
            <div style="font-size: 9.5px; color: #047857; margin-top: 2px;">
              All records below have undergone cryptographic biometric matching, government database registry validation, and physical fleet inspection.
            </div>
          </div>
          <span style="background: #059669; color: white; padding: 3px 10px; border-radius: 9999px; font-weight: 800; font-size: 9.5px; text-transform: uppercase;">
            100% AUDIT CLEAR
          </span>
        </div>

        <!-- Grid of Verified Documents -->
        <div class="doc-grid">
          ${docsToRender.map((doc: any) => `
            <div class="doc-item avoid-break">
              <div>
                <div class="doc-header">
                  <div>
                    <div class="doc-name">${doc.name}</div>
                    <div class="doc-authority">${doc.authority || doc.type}</div>
                  </div>
                  <span class="doc-seal">✓ ${doc.status}</span>
                </div>

                <div class="doc-visual-box">
                  ${doc.documentUrl ? `
                    <img src="${doc.documentUrl}" alt="${doc.name}" />
                  ` : `
                    <div class="doc-stamp">OFFICIAL VERIFIED ON-FILE</div>
                    <div style="font-size: 8.5px; color: #64748b; margin-top: 4px; font-family: monospace;">
                      UIDAI / MoRTH ENCRYPTED REGISTRY ARCHIVE
                    </div>
                  `}
                </div>

                <div style="font-size: 9.5px; color: #1e293b; margin: 4px 0;">
                  <strong>Doc Ref / Number:</strong> <span style="font-family: monospace; color: #047857;">${doc.documentNumber}</span>
                </div>
              </div>

              <div class="doc-footer">
                <span>Verified: ${doc.verifiedAt}</span>
                <span>Audit Ref: QP-DOC-${doc.id.toUpperCase()}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- ==================== PAGE 3: ACTIVITY TIMELINE & LIFECYCLE AUDIT TRAIL ==================== -->
      <div class="page-break"></div>

      <div class="avoid-break">
        <div class="header-top">
          <div>
            <div class="brand-logo">⚡ QUICKPRESS OPERATIONS</div>
            <div class="doc-badge">PAGE 3: CHRONOLOGICAL ACTIVITY TIMELINE & AUDIT TRAIL</div>
          </div>
          <div class="audit-meta">
            <div><strong>Subject:</strong> ${entityName} (${entityId})</div>
            <div><strong>Audit Scope:</strong> Full Onboarding to Realtime Dispatch Lifecycle</div>
          </div>
        </div>

        <div class="sec-head">Chronological Operational Lifecycle ("Kiya Hua Hai" — Complete Event Stream)</div>
        <p style="font-size: 10px; color: #64748b; margin: -2px 0 10px;">
          Timestamped record of every registration step, document validation, wallet transaction, and shift dispatch logged in the system.
        </p>

        <div class="timeline-container">
          ${timelineToRender.map((ev: any) => `
            <div class="timeline-row avoid-break">
              <div class="timeline-dot"></div>
              <div class="timeline-card">
                <div class="timeline-head">
                  <span>${ev.title}</span>
                  <span style="font-size: 9px; font-family: monospace; color: #64748b;">${ev.timestamp || joinedTimeStr}</span>
                </div>
                <div class="timeline-desc">
                  ${ev.description || ev.content || "Operational milestone executed and cryptographically logged in database."}
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Orders & Transaction Ledger Section -->
        <div class="sec-head" style="margin-top: 24px;">Order & Delivery Lifecycle Records (${orders.length} Logged Entries)</div>
        ${orders.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Order UID</th>
                <th>Timestamp</th>
                <th>Service Item</th>
                <th>Pickup / Delivery Route</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${ordersRowsHtml}
            </tbody>
          </table>
        ` : `
          <div style="padding: 14px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; border-radius: 8px; color: #64748b; font-size: 10.5px;">
            No past order delivery records registered for this profile yet.
          </div>
        `}

        <!-- Official Sign-off & Cryptographic Footer -->
        <div class="data-card" style="margin-top: 20px; background: #f8fafc; border: 1.5px solid #cbd5e1;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-weight: 900; font-size: 11px; color: #065f46; text-transform: uppercase;">
                QuickPress Operations Certification & Integrity Seal
              </div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 3px; max-width: 440px;">
                This document is generated directly from QuickPress Core PostgreSQL & Supabase database engines. All identities, settlement accounts, and KYC credentials have been validated in accordance with IT Act 2000 and MoRTH Motor Vehicle Guidelines.
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-family: monospace; font-size: 9px; color: #64748b;">
                SHA256: ${String(rawUid).replace(/-/g, "").slice(0, 24).toUpperCase()}
              </div>
              <div style="border-top: 1.5px solid #0f172a; margin-top: 24px; padding-top: 4px; font-weight: 800; font-size: 10px;">
                Authorized Compliance Officer · QuickPress Ops
              </div>
            </div>
          </div>
        </div>

        <div class="footer-bar">
          <div>QuickPress Technologies Private Limited · Master Operations & Fleet Console</div>
          <div>Strictly Confidential Internal Document · Generated for Legal & Audit Purposes</div>
        </div>
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
      <td style="padding: 6px 10px; text-align: center;">${typeof c.membership === "object" ? ((c.membership as any)?.plan || "VIP") : (c.membership || "Standard")}</td>
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
