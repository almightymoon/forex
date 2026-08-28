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
  tagline: 'Official payment receipt',
  support: 'thefxnavigators@gmail.com'
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

function drawReceiptPdf(payload) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    info: {
      Title: `Receipt ${payload.receiptNumber}`,
      Author: COMPANY.name,
      Subject: payload.subtitle || COMPANY.tagline
    }
  });

  const pageW = doc.page.width;
  const navy = '#0f172a';
  const gold = '#c9a227';
  const muted = '#64748b';
  const line = '#e2e8f0';

  doc.rect(0, 0, pageW, 92).fill(navy);
  doc.rect(0, 92, pageW, 4).fill(gold);

  const logoPath = findLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, 48, 22, { width: 48, height: 48, fit: [48, 48] });
    } catch {
      // continue without logo
    }
  }

  const titleX = logoPath ? 108 : 48;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(COMPANY.name, titleX, 28, {
    width: pageW - titleX - 48
  });
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(10).text(payload.subtitle || COMPANY.tagline, titleX, 52, {
    width: pageW - titleX - 48
  });

  doc.fillColor(navy).font('Helvetica-Bold').fontSize(22).text('OFFICIAL RECEIPT', 48, 120);
  doc.fillColor(muted).font('Helvetica').fontSize(10).text(`Receipt no.  ${payload.receiptNumber}`, 48, 148);
  doc.text(`Issued  ${formatDateLong(payload.issuedAt)}`, 48, 164);

  if (payload.statusLabel) {
    doc.fillColor('#047857').font('Helvetica-Bold').fontSize(10).text(payload.statusLabel, 360, 148, {
      width: pageW - 408,
      align: 'right'
    });
  }

  doc.moveTo(48, 190).lineTo(pageW - 48, 190).strokeColor(line).lineWidth(1).stroke();

  doc.fillColor(muted).font('Helvetica').fontSize(9).text('BILLED TO', 48, 206);
  doc.fillColor(navy).font('Helvetica-Bold').fontSize(12).text(payload.billedTo?.name || 'Member', 48, 220);
  doc.fillColor('#334155').font('Helvetica').fontSize(10).text(payload.billedTo?.email || '', 48, 238);

  if (payload.metaRows?.length) {
    let y = 206;
    payload.metaRows.forEach((row) => {
      doc.fillColor(muted).font('Helvetica').fontSize(9).text(row.label.toUpperCase(), 320, y, {
        width: pageW - 368,
        align: 'right'
      });
      doc.fillColor(navy).font('Helvetica').fontSize(10).text(row.value || '—', 320, y + 12, {
        width: pageW - 368,
        align: 'right'
      });
      y += 36;
    });
  }

  const tableTop = 290;
  doc.rect(48, tableTop, pageW - 96, 28).fill('#f8fafc');
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9);
  doc.text('DESCRIPTION', 60, tableTop + 9);
  doc.text('AMOUNT', 48, tableTop + 9, { width: pageW - 108, align: 'right' });

  let rowY = tableTop + 36;
  const lines = payload.lines?.length ? payload.lines : [{ description: '—', amount: 0, currency: payload.currency }];
  lines.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.rect(48, rowY - 8, pageW - 96, 26).fill('#fafafa');
    }
    doc.fillColor(navy).font('Helvetica').fontSize(10).text(item.description || 'Item', 60, rowY, {
      width: pageW - 220
    });
    doc.text(formatMoney(item.amount, item.currency || payload.currency), 48, rowY, {
      width: pageW - 108,
      align: 'right'
    });
    rowY += 26;
  });

  doc.moveTo(48, rowY + 4).lineTo(pageW - 48, rowY + 4).strokeColor(line).lineWidth(1).stroke();
  rowY += 18;

  if (Number(payload.discountAmount) > 0) {
    doc.fillColor(muted).font('Helvetica').fontSize(10).text('Discount', 48, rowY, { width: pageW - 108, align: 'right' });
    doc.text(`− ${formatMoney(payload.discountAmount, payload.currency)}`, 48, rowY + 14, {
      width: pageW - 108,
      align: 'right'
    });
    rowY += 36;
  }

  doc.fillColor(navy).font('Helvetica-Bold').fontSize(12).text('Total paid', 48, rowY, {
    width: pageW - 220
  });
  doc.fontSize(14).text(formatMoney(payload.total, payload.currency), 48, rowY, {
    width: pageW - 108,
    align: 'right'
  });

  rowY += 40;
  doc.rect(48, rowY, pageW - 96, 72).fill('#f8fafc');
  doc.fillColor(muted).font('Helvetica-Bold').fontSize(9).text('PAYMENT DETAILS', 60, rowY + 12);
  doc.fillColor(navy).font('Helvetica').fontSize(10);
  doc.text(`Method: ${payload.paymentMethod || '—'}`, 60, rowY + 28);
  doc.text(`Reference: ${payload.transactionId || payload.receiptNumber}`, 60, rowY + 44);

  if (payload.notes) {
    rowY += 88;
    doc.fillColor(muted).font('Helvetica').fontSize(9).text(payload.notes, 48, rowY, {
      width: pageW - 96
    });
  }

  const footerY = doc.page.height - 56;
  doc.moveTo(48, footerY - 16).lineTo(pageW - 48, footerY - 16).strokeColor(line).lineWidth(1).stroke();
  doc.fillColor(muted).font('Helvetica').fontSize(8).text(
    `${COMPANY.legal}  ·  This document is an official receipt for the transaction above.  ·  ${COMPANY.support}`,
    48,
    footerY,
    { width: pageW - 96, align: 'center' }
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
  const metaRows = [];
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
    notes: 'Thank you for your payment. Keep this receipt for your records.'
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
    notes:
      'This receipt confirms when the member joined Forex Navigators. Package and monthly-fee charges are issued as separate receipts when those payments are completed.'
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
