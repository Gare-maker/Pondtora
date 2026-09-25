import type { Investment, InvestmentPayment, Investor, InvestmentPaymentMethod, InvestmentPaymentStatus, InvestmentStatus } from "../app/types";
import { TODAY, isSameDate } from "../app/data";

/**
 * Helper to round to 2 decimal places or nearest whole integer if whole number
 */
export function roundCurrency(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * 1. Return Amount Calculation:
 * Investment Amount × Return Percentage ÷ 100
 */
export function calculateReturnAmount(investmentAmount: number, returnPercentage: number): number {
  const amt = Number(investmentAmount) || 0;
  const pct = Number(returnPercentage) || 0;
  if (amt <= 0 || pct <= 0) return 0;
  return roundCurrency((amt * pct) / 100);
}

/**
 * 2. Monthly Return Calculation:
 * Return Amount ÷ Number of Payments
 */
export function calculateMonthlyReturn(returnAmount: number, numberOfPayments: number): number {
  const ret = Number(returnAmount) || 0;
  const count = Math.max(1, parseInt(String(numberOfPayments), 10) || 1);
  if (ret <= 0) return 0;
  return roundCurrency(ret / count);
}

/**
 * 3. Principal + Return Total Due Calculation:
 * Investment Amount + Return Amount
 */
export function calculatePrincipalPlusReturn(investmentAmount: number, returnAmount: number): number {
  const amt = Number(investmentAmount) || 0;
  const ret = Number(returnAmount) || 0;
  return roundCurrency(amt + ret);
}

/**
 * 4. Upfront Return - Amount Actually Received by Business:
 * Investment Amount - Return Amount
 */
export function calculateAmountReceivedByBusiness(investmentAmount: number, returnAmount: number): number {
  const amt = Number(investmentAmount) || 0;
  const ret = Number(returnAmount) || 0;
  return Math.max(0, roundCurrency(amt - ret));
}

/**
 * 5. Total Investor Value:
 * Investment Amount + Return Amount
 */
export function calculateTotalInvestorValue(investmentAmount: number, returnAmount: number): number {
  const amt = Number(investmentAmount) || 0;
  const ret = Number(returnAmount) || 0;
  return roundCurrency(amt + ret);
}

/**
 * Generates automated payment schedule based on payment structure
 */
export function generateInvestmentSchedule(params: {
  investmentId: string;
  farmId: string;
  paymentMethod: InvestmentPaymentMethod;
  investmentAmount: number;
  returnPercentage: number;
  startDate: string;
  dueDate: string;
  durationMonths?: number;
  numberOfPayments?: number;
}): InvestmentPayment[] {
  const {
    investmentId,
    farmId,
    paymentMethod,
    investmentAmount,
    returnPercentage,
    startDate = TODAY,
    dueDate,
  } = params;

  const returnAmount = calculateReturnAmount(investmentAmount, returnPercentage);
  const payments: InvestmentPayment[] = [];

  const start = new Date(startDate || TODAY);

  if (paymentMethod === "monthly_return") {
    const installments = Math.max(1, params.numberOfPayments || params.durationMonths || 12);
    const baseMonthlyReturn = Math.floor(returnAmount / installments);
    const remainder = returnAmount - (baseMonthlyReturn * installments);

    for (let i = 1; i <= installments; i++) {
      const pDate = new Date(start);
      pDate.setMonth(pDate.getMonth() + i);
      const dateStr = pDate.toISOString().split("T")[0];
      const monthLabel = pDate.toLocaleString("en-US", { month: "short", year: "numeric" });
      
      // Add remainder to last installment for exact zero-drift sum
      const amountDue = i === installments ? (baseMonthlyReturn + remainder) : baseMonthlyReturn;

      payments.push({
        id: crypto.randomUUID(),
        investmentId,
        farmId,
        dueDate: dateStr,
        paymentPeriod: `Month ${i} of ${installments} (${monthLabel})`,
        paymentType: "Monthly Return",
        amountDue: roundCurrency(amountDue),
        scheduledAmount: roundCurrency(amountDue),
        amountPaid: 0,
        remainingAmount: roundCurrency(amountDue),
        paymentMethod: "Bank Transfer",
        status: "Pending",
        notes: `Monthly return installment ${i} of ${installments}`,
        createdAt: new Date().toISOString(),
      });
    }
  } else if (paymentMethod === "principal_plus_return") {
    const totalDue = calculatePrincipalPlusReturn(investmentAmount, returnAmount);
    payments.push({
      id: crypto.randomUUID(),
      investmentId,
      farmId,
      dueDate: dueDate || startDate,
      paymentPeriod: "Principal + Return Maturity Payout",
      paymentType: "Principal + Return",
      amountDue: roundCurrency(totalDue),
      scheduledAmount: roundCurrency(totalDue),
      amountPaid: 0,
      remainingAmount: roundCurrency(totalDue),
      paymentMethod: "Bank Transfer",
      status: "Pending",
      notes: "Full capital principal and agreed return payout on maturity date",
      createdAt: new Date().toISOString(),
    });
  } else if (paymentMethod === "return_upfront") {
    // 1. Upfront Return Payment (Due at start)
    payments.push({
      id: crypto.randomUUID(),
      investmentId,
      farmId,
      dueDate: startDate || TODAY,
      paymentPeriod: "Upfront Return Payout",
      paymentType: "Upfront Return",
      amountDue: roundCurrency(returnAmount),
      scheduledAmount: roundCurrency(returnAmount),
      amountPaid: 0,
      remainingAmount: roundCurrency(returnAmount),
      paymentMethod: "Bank Transfer",
      status: "Pending",
      notes: "Agreed return paid upfront to investor upon funding",
      createdAt: new Date().toISOString(),
    });

    // 2. Maturity Repayment of Principal (Due at maturity)
    payments.push({
      id: crypto.randomUUID(),
      investmentId,
      farmId,
      dueDate: dueDate || startDate,
      paymentPeriod: "Maturity Principal Repayment",
      paymentType: "Maturity Repayment",
      amountDue: roundCurrency(investmentAmount),
      scheduledAmount: roundCurrency(investmentAmount),
      amountPaid: 0,
      remainingAmount: roundCurrency(investmentAmount),
      paymentMethod: "Bank Transfer",
      status: "Pending",
      notes: "Return of full original face value capital at maturity",
      createdAt: new Date().toISOString(),
    });
  }

  return payments;
}

/**
 * Determines exact payment status based on due date and amounts paid
 */
export function derivePaymentStatus(payment: Partial<InvestmentPayment>, todayStr: string = TODAY): InvestmentPaymentStatus {
  const due = Number(payment.amountDue) || 0;
  const paid = Number(payment.amountPaid) || 0;

  if ((due > 0 && paid >= due) || (due === 0 && paid > 0)) {
    return "Paid";
  }
  if (paid > 0 && paid < due) {
    return "Partially Paid";
  }
  if (payment.dueDate) {
    if (isSameDate(payment.dueDate, todayStr)) {
      return "Due";
    }
    if (new Date(payment.dueDate) < new Date(todayStr)) {
      return "Overdue";
    }
  }
  return "Pending";
}

/**
 * Determines overall investment status based on payment schedule and dates
 */
export function deriveInvestmentStatus(
  investment: Partial<Investment>,
  payments: InvestmentPayment[],
  todayStr: string = TODAY
): InvestmentStatus {
  if (investment.status === "Cancelled") {
    return "Cancelled";
  }

  if (payments.length === 0) {
    return (investment.status as InvestmentStatus) || "Active";
  }

  const allPaid = payments.every(p => {
    const due = Number(p.amountDue) || 0;
    const paid = Number(p.amountPaid) || 0;
    return (due > 0 && paid >= due) || (due === 0 && paid > 0);
  });
  if (allPaid) {
    return "Completed";
  }

  const anyOverdue = payments.some(p => {
    const due = Number(p.amountDue) || 0;
    const paid = Number(p.amountPaid) || 0;
    const isPaid = (due > 0 && paid >= due) || (due === 0 && paid > 0);
    if (isPaid) return false;
    return p.dueDate && new Date(p.dueDate) < new Date(todayStr);
  });
  if (anyOverdue) {
    return "Overdue";
  }

  const anyDueToday = payments.some(p => {
    const due = Number(p.amountDue) || 0;
    const paid = Number(p.amountPaid) || 0;
    const isPaid = (due > 0 && paid >= due) || (due === 0 && paid > 0);
    if (isPaid) return false;
    return p.dueDate && isSameDate(p.dueDate, todayStr);
  });
  if (anyDueToday) {
    return "Payment Due";
  }

  const totalPaid = payments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  if (totalPaid > 0) {
    return "Partially Paid";
  }

  return "Active";
}

/**
 * Formats a payment method into human-readable text
 */
export function formatPaymentMethod(method?: InvestmentPaymentMethod | string): string {
  switch (method) {
    case "monthly_return":
      return "Monthly Return";
    case "principal_plus_return":
      return "Principal + Return on Date";
    case "return_upfront":
      return "Return Paid Upfront";
    default:
      return method || "Monthly Return";
  }
}

/**
 * Aggregates all statistics for the investment dashboard
 */
export function calculateInvestmentDashboardStats(
  investments: Investment[],
  payments: InvestmentPayment[],
  investors: Investor[],
  todayStr: string = TODAY
) {
  // If there are no investors, everything should strictly be 0
  if (!investors || investors.length === 0) {
    return {
      totalInvestors: 0,
      totalInvestment: 0,
      totalReturn: 0,
      totalPaid: 0,
      totalRemaining: 0,
      upcomingCount: 0,
      upcomingAmount: 0,
      dueTodayCount: 0,
      dueTodayAmount: 0,
      overdueCount: 0,
      overdueAmount: 0,
      activeInvestmentsCount: 0,
      completedInvestmentsCount: 0,
    };
  }

  const validInvestorIds = new Set(investors.map(inv => inv.id));
  const validInvestments = (investments || []).filter(inv => validInvestorIds.has(inv.investorId) || validInvestorIds.has(inv.id));
  const validInvestmentIds = new Set(validInvestments.map(inv => inv.id));
  const validPayments = (payments || []).filter(p => validInvestmentIds.has(p.investmentId));

  const totalInvestors = investors.length;
  const totalInvestment = validInvestments.reduce((sum, inv) => sum + (Number(inv.amountInvested) || 0), 0);
  const totalReturn = validInvestments.reduce((sum, inv) => sum + (Number(inv.expectedReturn) || 0), 0);
  
  const totalPaid = validPayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  
  let totalObligations = 0;
  validInvestments.forEach(inv => {
    const invPayments = validPayments.filter(p => p.investmentId === inv.id);
    if (invPayments.length > 0) {
      const scheduledForInv = invPayments.reduce((s, p) => s + (Number(p.amountDue) || 0), 0);
      totalObligations += scheduledForInv;
    } else {
      const dueForInv = Number(inv.totalAmountDue) || (
        inv.paymentMethod === "monthly_return"
          ? (Number(inv.expectedReturn) || 0)
          : (Number(inv.amountInvested) || 0) + (Number(inv.expectedReturn) || 0)
      );
      totalObligations += dueForInv;
    }
  });

  const matchedPaymentIds = new Set(validInvestments.flatMap(inv => validPayments.filter(p => p.investmentId === inv.id).map(p => p.id)));
  validPayments.forEach(p => {
    if (!matchedPaymentIds.has(p.id)) {
      totalObligations += Number(p.amountDue) || 0;
    }
  });

  const totalRemaining = Math.max(0, totalObligations - totalPaid);

  let upcomingCount = 0;
  let upcomingAmount = 0;
  let dueTodayCount = 0;
  let dueTodayAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  validPayments.forEach(p => {
    const remaining = Math.max(0, (Number(p.amountDue) || 0) - (Number(p.amountPaid) || 0));
    if (remaining <= 0 || !p.dueDate) return;

    const diffDays = Math.ceil((new Date(p.dueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdueCount++;
      overdueAmount += remaining;
    } else if (diffDays === 0 || isSameDate(p.dueDate, todayStr)) {
      dueTodayCount++;
      dueTodayAmount += remaining;
    } else if (diffDays > 0 && diffDays <= 7) {
      upcomingCount++;
      upcomingAmount += remaining;
    }
  });

  const activeInvestmentsCount = validInvestments.filter(inv => {
    const invPayments = validPayments.filter(p => p.investmentId === inv.id);
    const st = deriveInvestmentStatus(inv, invPayments, todayStr);
    return st === "Active" || st === "Payment Due" || st === "Partially Paid" || st === "Overdue";
  }).length;

  const completedInvestmentsCount = validInvestments.filter(inv => {
    const invPayments = validPayments.filter(p => p.investmentId === inv.id);
    const st = deriveInvestmentStatus(inv, invPayments, todayStr);
    return st === "Completed";
  }).length;

  return {
    totalInvestors,
    totalInvestment: roundCurrency(totalInvestment),
    totalReturn: roundCurrency(totalReturn),
    totalPaid: roundCurrency(totalPaid),
    totalRemaining: roundCurrency(totalRemaining),
    upcomingCount,
    upcomingAmount: roundCurrency(upcomingAmount),
    dueTodayCount,
    dueTodayAmount: roundCurrency(dueTodayAmount),
    overdueCount,
    overdueAmount: roundCurrency(overdueAmount),
    activeInvestmentsCount,
    completedInvestmentsCount,
  };
}

/**
 * Builds the full official HTML document for Investment Certificate & Receipt
 * Used for browser printing/PDF generation and email dispatch.
 */
export function generateInvestorReceiptHtml(params: {
  investor: Partial<Investor>;
  investment?: Partial<Investment> | null;
  payments?: InvestmentPayment[];
  farmName?: string;
  farmLocation?: string;
  currency?: string;
}): { html: string; receiptRef: string; subject: string } {
  const {
    investor,
    investment,
    payments = [],
    farmName = "Pondtora Farm",
    farmLocation = "Nigeria",
    currency = "₦",
  } = params;

  const invName = investor?.fullName || "Investor";
  const amountInvested = Number(investment?.amountInvested) || 0;
  const agreedPercentage = Number(investment?.investorPercentage) || 0;
  const expectedReturn = Number(investment?.expectedReturn) || calculateReturnAmount(amountInvested, agreedPercentage);
  const paymentMethod = investment?.paymentMethod || "monthly_return";
  const totalDue = Number(investment?.totalAmountDue) || (
    paymentMethod === "principal_plus_return"
      ? calculatePrincipalPlusReturn(amountInvested, expectedReturn)
      : paymentMethod === "return_upfront"
      ? amountInvested
      : expectedReturn
  );
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const receiptRef = `INV-${invName.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase()}-${(investment?.id || investor?.id || "REC").slice(0, 8).toUpperCase()}`;
  const subject = `Investment Certificate & Receipt [${receiptRef}] - ${farmName}`;

  let structureMetricsHtml = "";
  if (paymentMethod === "monthly_return") {
    const mReturn = Number(investment?.monthlyReturn) || calculateMonthlyReturn(expectedReturn, investment?.numberOfPayments || 12);
    structureMetricsHtml = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
        <span style="color: #64748b;">Monthly Return Installment:</span>
        <strong style="color: #047857;">${currency}${mReturn.toLocaleString()} / month</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
        <span style="color: #64748b;">Total Expected Return:</span>
        <strong style="color: #047857;">${currency}${expectedReturn.toLocaleString()} (${agreedPercentage}%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
        <span style="color: #64748b;">Total Investor Value at Maturity:</span>
        <strong style="color: #0f172a;">${currency}${(Number(investment?.totalInvestorValue) || (amountInvested + expectedReturn)).toLocaleString()}</strong>
      </div>
    `;
  } else if (paymentMethod === "principal_plus_return") {
    const pPlusR = Number(investment?.totalAmountDue) || calculatePrincipalPlusReturn(amountInvested, expectedReturn);
    structureMetricsHtml = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
        <span style="color: #64748b;">Agreed Return Amount:</span>
        <strong style="color: #047857;">${currency}${expectedReturn.toLocaleString()} (${agreedPercentage}%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
        <span style="color: #64748b;">Full Payout on Maturity (Principal + Return):</span>
        <strong style="color: #0f172a; font-size: 14px;">${currency}${pPlusR.toLocaleString()}</strong>
      </div>
    `;
  } else {
    const netReceived = Number(investment?.amountReceivedByBusiness) || calculateAmountReceivedByBusiness(amountInvested, expectedReturn);
    structureMetricsHtml = `
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
        <span style="color: #64748b;">Upfront Return Deducted:</span>
        <strong style="color: #047857;">${currency}${expectedReturn.toLocaleString()} (${agreedPercentage}%)</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
        <span style="color: #64748b;">Net Amount Received by Farm:</span>
        <strong style="color: #1d4ed8;">${currency}${netReceived.toLocaleString()}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;">
        <span style="color: #64748b;">Maturity Capital Return:</span>
        <strong style="color: #0f172a;">${currency}${amountInvested.toLocaleString()}</strong>
      </div>
    `;
  }

  const paymentRowsHtml = (payments && payments.length > 0)
    ? payments.map((p, idx) => {
        const isPaid = (Number(p.amountPaid) || 0) >= (Number(p.amountDue) || 0) && (Number(p.amountDue) || 0) > 0;
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; text-align: left; color: #475569;">#${idx + 1}</td>
            <td style="padding: 8px 10px; text-align: left; font-weight: 600; color: #0f172a;">${p.paymentPeriod || "Installment"}</td>
            <td style="padding: 8px 10px; text-align: left; font-family: monospace; color: #334155;">${p.dueDate || "—"}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #0f172a;">${currency}${Number(p.amountDue || 0).toLocaleString()}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: ${isPaid ? '#047857' : '#64748b'};">${currency}${Number(p.amountPaid || 0).toLocaleString()}</td>
            <td style="padding: 8px 10px; text-align: center; color: #475569; font-family: monospace;">${p.paymentDate || p.paidDate || "—"}</td>
            <td style="padding: 8px 10px; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: ${isPaid ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'}">
                ${p.status || (isPaid ? 'Paid' : 'Due')}
              </span>
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">No payment schedule entries recorded.</td>
      </tr>
    `;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${receiptRef} - Investment Certificate & Receipt</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #f8fafc; padding: 24px; line-height: 1.4; }
        .receipt-box { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .brand-title { font-size: 22px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; }
        .receipt-title { font-size: 16px; font-weight: 700; color: #0f172a; }
        .meta-text { font-size: 11px; color: #64748b; }
        .divider { border: 0; height: 1px; background: #e2e8f0; margin: 16px 0; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
        .grid-2 { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .grid-2 td { width: 50%; vertical-align: top; padding-right: 12px; }
        .grid-2 td:last-child { padding-right: 0; padding-left: 12px; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .info-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
        .info-label { color: #64748b; }
        .info-value { font-weight: 600; color: #0f172a; text-align: right; }
        .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0; }
        .structure-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 14px 0; }
        .schedule-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .schedule-table th { background: #f1f5f9; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
        .footer-section { margin-top: 28px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
        .signature-table { width: 100%; border-collapse: collapse; margin-top: 32px; }
        .signature-line { border-top: 1px solid #94a3b8; width: 80%; margin-top: 40px; }
        @media print {
          body { padding: 0; background: #fff; }
          .receipt-box { border: none; padding: 0; box-shadow: none; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-title">${farmName}</div>
              <div class="meta-text">${farmLocation} · Farm Investor Management</div>
            </td>
            <td style="text-align: right;">
              <div class="receipt-title">Investment Certificate & Receipt</div>
              <div class="meta-text" style="font-family: monospace; font-weight: bold; color: #0f172a; margin-top: 2px;">${receiptRef}</div>
              <div class="meta-text">Issue Date: ${TODAY}</div>
            </td>
          </tr>
        </table>

        <hr class="divider" />

        <!-- Investor & Terms Info -->
        <table class="grid-2">
          <tr>
            <td>
              <div class="section-title">Investor Details</div>
              <div class="info-card">
                <div class="info-row"><span class="info-label">Full Name:</span><span class="info-value">${invName}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value" style="font-family: monospace;">${investor?.phone || "—"}</span></div>
                <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${investor?.email || "—"}</span></div>
                <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #047857;">${investor?.status || "Active"}</span></div>
              </div>
            </td>
            <td>
              <div class="section-title">Investment Terms & Dates</div>
              <div class="info-card">
                <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">${formatPaymentMethod(investment?.paymentMethod)}</span></div>
                <div class="info-row"><span class="info-label">Start Date:</span><span class="info-value" style="font-family: monospace;">${investment?.startDate || TODAY}</span></div>
                <div class="info-row"><span class="info-label">Maturity Date:</span><span class="info-value" style="font-family: monospace;">${investment?.dueDate || "—"}</span></div>
                <div class="info-row"><span class="info-label">Duration:</span><span class="info-value">${investment?.duration || (investment?.durationMonths ? `${investment.durationMonths} months` : "12 months")}</span></div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Financial Overview Box -->
        <div class="summary-card">
          <div class="section-title" style="color: #166534; margin-bottom: 8px;">Financial Overview</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 8px; width: 25%;">
                <span class="info-label" style="display: block;">Capital Invested</span>
                <strong style="font-size: 16px; color: #0f172a;">${currency}${amountInvested.toLocaleString()}</strong>
              </td>
              <td style="padding: 4px 8px; width: 25%;">
                <span class="info-label" style="display: block;">Agreed Return Rate</span>
                <strong style="font-size: 16px; color: #047857;">${agreedPercentage}% (${currency}${expectedReturn.toLocaleString()})</strong>
              </td>
              <td style="padding: 4px 8px; width: 25%;">
                <span class="info-label" style="display: block;">Total Paid to Date</span>
                <strong style="font-size: 16px; color: #6b21a8;">${currency}${totalPaid.toLocaleString()}</strong>
              </td>
              <td style="padding: 4px 8px; width: 25%;">
                <span class="info-label" style="display: block;">Outstanding Balance</span>
                <strong style="font-size: 16px; color: #b45309;">${currency}${outstanding.toLocaleString()}</strong>
              </td>
            </tr>
          </table>
        </div>

        <!-- Structure Specific Breakdown -->
        <div class="structure-box">
          <div class="section-title">Structure Breakdown: ${formatPaymentMethod(investment?.paymentMethod)}</div>
          ${structureMetricsHtml}
        </div>

        <!-- Schedule Table -->
        <div class="section-title">Schedule of Payments & Installments</div>
        <table class="schedule-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Period / Description</th>
              <th>Due Date</th>
              <th style="text-align: right;">Amount Due</th>
              <th style="text-align: right;">Amount Paid</th>
              <th style="text-align: center;">Paid Date</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRowsHtml}
          </tbody>
        </table>

        <!-- Notes -->
        ${investment?.principalRepayment || investment?.notes || investor?.notes ? `
          <div style="margin-top: 16px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; color: #475569;">
            <strong>Terms & Agreement Notes:</strong> ${investment?.principalRepayment || investment?.notes || investor?.notes}
          </div>
        ` : ""}

        <!-- Footer -->
        <div class="footer-section">
          <p style="font-size: 10px; color: #64748b; text-align: center;">
            This certificate confirms the official investment registration in the ${farmName} System. All disbursements are tracked securely.
          </p>
          <table class="signature-table">
            <tr>
              <td style="width: 50%; text-align: center;">
                <div class="signature-line" style="margin: 30px auto 4px auto;"></div>
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${invName}</div>
                <div style="font-size: 10px; color: #64748b;">Investor Signature</div>
              </td>
              <td style="width: 50%; text-align: center;">
                <div class="signature-line" style="margin: 30px auto 4px auto;"></div>
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${farmName}</div>
                <div style="font-size: 10px; color: #64748b;">Authorized Representative & Stamp</div>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  return { html, receiptRef, subject };
}

