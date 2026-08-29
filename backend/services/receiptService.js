const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { feeMonthForMonthlyFeePayment } = require('../utils/monthlyFeeStatus');

const COMPANY = {
  name: 'Forex Navigators',
  legal: 'Forex Navigators LMS',
  tagline: 'Official payment record',
  support: 'thefxnavigators@gmail.com',
  web: 'forexnavigators.com'
};

const TYPE_PREFIX = {
  package: 'PKG',
  monthly_fee: 'MFEE',
  product: 'PRD',
  course: 'CRS',
  signup: 'SIGN',
  subscription: 'SUB',
  session: 'SESS',
  signal: 'SIG'
};

const TYPE_LABEL = {
  package: 'Package',
  monthly_fee: 'Monthly fee',
  product: 'Shop purchase',
  course: 'Course',
  signup: 'Signup',
  subscription: 'Subscription',
  session: 'Live session',
  signal: 'Signal'
};

function shortId(id) {
  return String(id || '').replace(/[^a-fA-F0-9]/g, '').slice(-6).toUpperCase() || '000000';
}

function yearOf(date) {
  const d = date ? new Date(date) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().getUTCFullYear() : d.getUTCFullYear();
}

function formatMoney(amount, currency = 'USD') {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  const code = String(currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function formatDateLong(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatPaymentMethod(method) {
  const m = String(method || '').toLowerCase();
  const map = {
    binance_wallet: 'USDT (Binance)',
    stripe: 'Card (Stripe)',
    paypal: 'PayPal',
    jazzcash: 'JazzCash',
    easypaisa: 'EasyPaisa',
    bank_transfer: 'Bank transfer',
    cash: 'Cash',
    promo_code: 'Promo code',
    credit_card: 'Credit card'
  };
  return map[m] || (m ? m.replace(/_/g, ' ') : '—');
}

function receiptNumberForPayment(payment) {
  if (payment?.receiptNumber) return payment.receiptNumber;
  const prefix = TYPE_PREFIX[payment?.type] || 'PAY';
  const y = yearOf(payment?.confirmedAt || payment?.createdAt);
  return `FXN-${prefix}-${y}-${shortId(payment?._id)}`;
}

function joinReceiptNumber(user) {
  const y = yearOf(user?.createdAt);
  return `FXN-JOIN-${y}-${shortId(user?._id)}`;
}

function paymentTitle(payment) {
  const type = payment?.type;
  if (type === 'package') {
    return `Package — ${payment.package?.name || 'Membership'}`;
  }
  if (type === 'monthly_fee') {
    const { feeForMonthLabel } = feeMonthForMonthlyFeePayment(payment);
    return feeForMonthLabel ? `Monthly fee — ${feeForMonthLabel}` : 'Monthly fee';
  }
  if (type === 'product') {
    const items = Array.isArray(payment.productItems) ? payment.productItems : [];
    if (items.length > 1) return `Shop — ${items.length} items`;
    return `Shop — ${payment.product?.name || items[0]?.name || 'Product'}`;
  }
  if (type === 'course') return 'Course purchase';
  return TYPE_LABEL[type] || 'Payment';
}

function paymentLineItems(payment) {
  const currency = payment.currency || 'USD';
  if (payment.type === 'product' && Array.isArray(payment.productItems) && payment.productItems.length) {
    return payment.productItems.map((item) => {
      const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const unit = Number(item.price) || 0;
      return {
        description: qty > 1 ? `${item.name || 'Item'} × ${qty}` : (item.name || 'Item'),
        amount: unit * qty,
        currency
      };
    });
  }
  return [
    {
      description: paymentTitle(payment),
      amount: payment.finalAmount ?? payment.amount ?? 0,
      currency
    }
  ];
}

function findLogoPath() {
  const candidates = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, '../../frontend/public/all-07.png'),
    path.join(__dirname, '../../frontend/public/icon-192.png'),
    path.join(__dirname, '../../frontend/public/assets/logo.png')
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function formatDateShort(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function hrule(doc, x, y, w, color = '#e5e7eb') {
  doc.save();
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(0.5).stroke();
  doc.restore();
}

/** Compact single-page receipt — content flows top-to-bottom, never adds a second page. */
function drawReceiptPdf(payload) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Receipt ${payload.receiptNumber}`,
      Author: COMPANY.name,
      Subject: payload.subtitle || COMPANY.tagline,
      Creator: COMPANY.legal
    }
  });

  const pageW = doc.page.width;
  const M = 52;
  const W = pageW - M * 2;

  const C = {
    ink: '#111827',
    body: '#374151',
    muted: '#6b7280',
    faint: '#9ca3af',
    line: '#e5e7eb',
    brand: '#1d4ed8',
    paid: '#047857',
    paidBg: '#ecfdf5',
    rowBg: '#f9fafb'
  };

  const status = String(payload.statusLabel || 'PAID').toUpperCase();

  doc.rect(0, 0, pageW, doc.page.height).fill('#ffffff');
  doc.rect(0, 0, pageW, 3).fill(C.brand);

  let y = M;

  const logoPath = findLogoPath();
  const logoSz = 36;
  if (logoPath) {
    try {
      doc.image(logoPath, M, y, { width: logoSz, height: logoSz, fit: [logoSz, logoSz] });
    } catch {
      // skip
    }
  }

  const tx = logoPath ? M + logoSz + 12 : M;
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(14).text(COMPANY.name, tx, y + 2, { width: W * 0.45 });
  doc.fillColor(C.muted).font('Helvetica').fontSize(8).text(COMPANY.legal, tx, y + 18, { width: W * 0.45 });

  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text('RECEIPT', M, y, {
    width: W,
    align: 'right',
    characterSpacing: 1
  });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text(
    payload.subtitle || COMPANY.tagline,
    M,
    y + 9,
    { width: W, align: 'right' }
  );

  const pillW = Math.max(48, status.length * 5.5 + 16);
  const pillX = pageW - M - pillW;
  doc.roundedRect(pillX, y + 24, pillW, 16, 8).fill(C.paidBg);
  doc.fillColor(C.paid).font('Helvetica-Bold').fontSize(7).text(status, pillX, y + 28, {
    width: pillW,
    align: 'center'
  });

  y += logoSz + 14;
  hrule(doc, M, y, W, C.line);
  y += 16;

  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text('NUMBER', M, y, { characterSpacing: 0.6 });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10).text(payload.receiptNumber, M, y + 9);

  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text('DATE', M + W * 0.55, y, {
    width: W * 0.45,
    align: 'right',
    characterSpacing: 0.6
  });
  doc.fillColor(C.body).font('Helvetica').fontSize(9).text(formatDateShort(payload.issuedAt), M + W * 0.55, y + 9, {
    width: W * 0.45,
    align: 'right'
  });

  y += 30;
  hrule(doc, M, y, W, C.line);
  y += 14;

  const half = (W - 24) / 2;
  const rx = M + half + 24;

  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text('BILLED TO', M, y, { characterSpacing: 0.6 });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(10).text(payload.billedTo?.name || 'Member', M, y + 9, {
    width: half
  });
  doc.fillColor(C.muted).font('Helvetica').fontSize(8).text(payload.billedTo?.email || '', M, y + 22, {
    width: half
  });

  const meta = (Array.isArray(payload.metaRows) ? payload.metaRows : []).slice(0, 3);
  if (!meta.length) meta.push({ label: 'Type', value: payload.subtitle || 'Payment' });

  let ry = y;
  meta.forEach((row) => {
    doc.fillColor(C.faint).font('Helvetica').fontSize(7).text(row.label.toUpperCase(), rx, ry, {
      width: half,
      characterSpacing: 0.6
    });
    doc.fillColor(C.body).font('Helvetica').fontSize(9).text(row.value || '—', rx, ry + 9, { width: half });
    ry += 22;
  });

  y = Math.max(y + 38, ry) + 10;
  hrule(doc, M, y, W, C.line);
  y += 12;

  doc.rect(M, y, W, 20).fill(C.rowBg);
  doc.fillColor(C.faint).font('Helvetica-Bold').fontSize(7).text('DESCRIPTION', M + 10, y + 6, {
    characterSpacing: 0.6
  });
  doc.text('AMOUNT', M, y + 6, { width: W - 10, align: 'right', characterSpacing: 0.6 });
  y += 24;

  const lines = payload.lines?.length
    ? payload.lines
    : [{ description: '—', amount: 0, currency: payload.currency }];

  lines.forEach((item, i) => {
    if (i % 2 === 1) doc.rect(M, y - 2, W, 20).fill('#fdfdfd');
    doc.fillColor(C.ink).font('Helvetica').fontSize(9).text(item.description || 'Item', M + 10, y + 2, {
      width: W * 0.65
    });
    doc.font('Helvetica-Bold').text(
      formatMoney(item.amount, item.currency || payload.currency),
      M,
      y + 2,
      { width: W - 10, align: 'right' }
    );
    y += 22;
  });

  y += 4;
  hrule(doc, M + W * 0.5, y, W * 0.5, C.line);
  y += 10;

  if (Number(payload.discountAmount) > 0) {
    doc.fillColor(C.muted).font('Helvetica').fontSize(8).text('Discount', M + W * 0.5, y);
    doc.fillColor(C.paid).text(
      `− ${formatMoney(payload.discountAmount, payload.currency)}`,
      M,
      y,
      { width: W - 10, align: 'right' }
    );
    y += 16;
  }

  doc.fillColor(C.muted).font('Helvetica').fontSize(8).text('Total paid', M + W * 0.5, y);
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(14).text(
    formatMoney(payload.total, payload.currency),
    M,
    y - 1,
    { width: W - 10, align: 'right' }
  );

  y += 28;
  hrule(doc, M, y, W, C.line);
  y += 12;

  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text('PAYMENT', M, y, { characterSpacing: 0.6 });
  y += 10;
  doc.fillColor(C.body).font('Helvetica').fontSize(8.5);
  doc.text(`Method: ${payload.paymentMethod || '—'}`, M, y, { width: half });
  doc.text(`Ref: ${payload.transactionId || payload.receiptNumber}`, rx, y, { width: half });

  if (payload.notes) {
    y += 14;
    doc.fillColor(C.muted).font('Helvetica').fontSize(7.5).text(payload.notes, M, y, {
      width: W,
      lineGap: 1
    });
  }

  y += 28;
  hrule(doc, M, y, W, C.line);
  y += 10;
  doc.fillColor(C.faint).font('Helvetica').fontSize(7).text(
    `${COMPANY.legal}  ·  ${COMPANY.support}`,
    M,
    y,
    { width: W, align: 'center' }
  );

  return pdfToBuffer(doc);
}

async function ensurePaymentReceiptNumber(payment) {
  const number = receiptNumberForPayment(payment);
  if (!payment.receiptNumber) {
    payment.receiptNumber = number;
    try {
      if (typeof payment.save === 'function') {
        await payment.save();
      } else {
        await Payment.updateOne({ _id: payment._id }, { $set: { receiptNumber: number } });
      }
    } catch (err) {
      console.error('[Receipt] Could not persist receiptNumber:', err?.message || err);
    }
  }
  return number;
}

function userDisplayName(user) {
  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return name || user?.email || 'Member';
}

async function resolveUser(userOrId) {
  if (userOrId && typeof userOrId === 'object' && userOrId.email) return userOrId;
  const id = userOrId && typeof userOrId === 'object' ? userOrId._id : userOrId;
  return User.findById(id).select('firstName lastName email createdAt selectedPackage').lean();
}

async function generatePaymentReceiptPdf(payment, user) {
  const billedTo = await resolveUser(user || payment.user);
  const receiptNumber = await ensurePaymentReceiptNumber(payment);
  const issuedAt = payment.confirmedAt || payment.createdAt;
  const lines = paymentLineItems(payment);
  const metaRows = [
    { label: 'Type', value: TYPE_LABEL[payment.type] || 'Payment' },
    { label: 'Currency', value: String(payment.currency || 'USD').toUpperCase() }
  ];
  if (payment.type === 'package' && payment.package?.name) {
    metaRows.push({ label: 'Package', value: payment.package.name });
  }
  if (payment.type === 'monthly_fee') {
    const { feeForMonthLabel } = feeMonthForMonthlyFeePayment(payment);
    if (feeForMonthLabel) metaRows.push({ label: 'Fee period', value: feeForMonthLabel });
  }

  return drawReceiptPdf({
    receiptNumber,
    subtitle: TYPE_LABEL[payment.type] || 'Payment receipt',
    issuedAt,
    statusLabel: 'PAID',
    billedTo: { name: userDisplayName(billedTo), email: billedTo?.email || '' },
    metaRows,
    lines,
    discountAmount: payment.discountAmount,
    total: payment.finalAmount ?? payment.amount ?? 0,
    currency: payment.currency || 'USD',
    paymentMethod: formatPaymentMethod(payment.paymentMethod),
    transactionId: payment.transactionId || String(payment._id),
    notes:
      'Thank you for your payment. Keep this receipt for your records.'
  });
}

async function generateJoinReceiptPdf(userDoc) {
  const user = await resolveUser(userDoc);
  if (!user) throw new Error('User not found');

  const latestPackage = await Payment.findOne({
    user: user._id,
    type: 'package',
    status: 'completed'
  })
    .sort({ confirmedAt: -1, createdAt: -1 })
    .lean();

  const packageName =
    latestPackage?.package?.name || user.selectedPackage?.packageName || 'Not assigned';

  return drawReceiptPdf({
    receiptNumber: joinReceiptNumber(user),
    subtitle: 'Membership / join receipt',
    issuedAt: user.createdAt,
    statusLabel: 'REGISTERED',
    billedTo: { name: userDisplayName(user), email: user.email || '' },
    metaRows: [
      { label: 'Member since', value: formatDateLong(user.createdAt) },
      { label: 'Package', value: packageName }
    ],
    lines: [
      {
        description: 'Account registration',
        amount: 0,
        currency: 'USD'
      }
    ],
    total: 0,
    currency: 'USD',
    paymentMethod: 'Membership record',
    transactionId: String(user._id),
    notes: 'Confirms membership registration. Package and fee charges are issued as separate receipts.'
  });
}

function serializePaymentReceipt(payment) {
  const { feeForMonthLabel } = payment.type === 'monthly_fee'
    ? feeMonthForMonthlyFeePayment(payment)
    : { feeForMonthLabel: null };
  return {
    id: String(payment._id),
    kind: payment.type,
    title: paymentTitle(payment),
    amount: payment.finalAmount ?? payment.amount ?? 0,
    currency: payment.currency || 'USD',
    issuedAt: payment.confirmedAt || payment.createdAt,
    receiptNumber: receiptNumberForPayment(payment),
    transactionId: payment.transactionId || null,
    feeForMonthLabel,
    paymentMethod: formatPaymentMethod(payment.paymentMethod)
  };
}

async function listReceiptsForUser(userId) {
  const user = await User.findById(userId)
    .select('firstName lastName email createdAt selectedPackage')
    .lean();
  if (!user) return null;

  const payments = await Payment.find({ user: userId, status: 'completed' })
    .sort({ createdAt: -1 })
    .lean();

  const latestPackage = payments.find((p) => p.type === 'package');

  return {
    join: {
      kind: 'join',
      title: 'Membership / join receipt',
      issuedAt: user.createdAt,
      receiptNumber: joinReceiptNumber(user),
      packageName: latestPackage?.package?.name || user.selectedPackage?.packageName || null
    },
    payments: payments.map(serializePaymentReceipt)
  };
}

async function findCompletedPaymentByRef(idOrTxn) {
  const ref = String(idOrTxn || '').trim();
  if (!ref) return null;
  if (mongoose.Types.ObjectId.isValid(ref)) {
    const byId = await Payment.findOne({ _id: ref, status: 'completed' });
    if (byId) return byId;
  }
  return Payment.findOne({ transactionId: ref, status: 'completed' });
}

function receiptFilename(receiptNumber) {
  const safe = String(receiptNumber || 'receipt').replace(/[^A-Za-z0-9_-]/g, '-');
  return `Forex-Navigators-${safe}.pdf`;
}

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(buffer);
}

function canAccessPayment(reqUser, payment) {
  const ownerId = payment.user && typeof payment.user === 'object' && payment.user._id != null
    ? payment.user._id
    : payment.user;
  return String(ownerId) === String(reqUser._id) || reqUser.role === 'admin';
}

module.exports = {
  receiptNumberForPayment,
  joinReceiptNumber,
  paymentTitle,
  formatPaymentMethod,
  ensurePaymentReceiptNumber,
  generatePaymentReceiptPdf,
  generateJoinReceiptPdf,
  listReceiptsForUser,
  findCompletedPaymentByRef,
  receiptFilename,
  sendPdf,
  canAccessPayment
};
