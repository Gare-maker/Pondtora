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
  const totalInvestors = investors.length;
  const totalInvestment = investments.reduce((sum, inv) => sum + (Number(inv.amountInvested) || 0), 0);
  const totalReturn = investments.reduce((sum, inv) => sum + (Number(inv.expectedReturn) || 0), 0);
  
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  
  let totalObligations = 0;
  investments.forEach(inv => {
    const invPayments = payments.filter(p => p.investmentId === inv.id);
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

  const matchedPaymentIds = new Set(investments.flatMap(inv => payments.filter(p => p.investmentId === inv.id).map(p => p.id)));
  payments.forEach(p => {
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

  payments.forEach(p => {
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

  const activeInvestmentsCount = investments.filter(inv => {
    const invPayments = payments.filter(p => p.investmentId === inv.id);
    const st = deriveInvestmentStatus(inv, invPayments, todayStr);
    return st === "Active" || st === "Payment Due" || st === "Partially Paid" || st === "Overdue";
  }).length;

  const completedInvestmentsCount = investments.filter(inv => {
    const invPayments = payments.filter(p => p.investmentId === inv.id);
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
