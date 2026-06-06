import { Expense } from "./storage";

/**
 * Format date string (YYYY-MM-DD or other format) into Indian format (e.g. "06 Jun")
 */
export function formatIndianDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    let dateObj: Date;
    if (parts.length === 3) {
      // Avoid time zone issues with manual date parsing
      dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      dateObj = new Date(dateStr);
    }
    
    if (isNaN(dateObj.getTime())) return dateStr;
    
    const day = dateObj.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dateObj.getMonth()];
    return `${day} ${month}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Split settlements solver: greedy settlement matching to compute minimal transact steps.
 * Returns balances mapping and settlement list.
 */
export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
}

export function calculateBalancesAndSettlements(
  members: string[],
  expenses: Expense[]
): {
  balances: { [name: string]: number };
  settlements: Settlement[];
} {
  // Initialize balances
  const balances: { [name: string]: number } = {};
  members.forEach(m => {
    balances[m] = 0;
  });

  // Calculate net balances
  expenses.forEach(exp => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0 || exp.splitAmong.length === 0) return;

    // Credit the payer
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += amount;
    }

    // Debit the split members
    const individualShare = amount / exp.splitAmong.length;
    exp.splitAmong.forEach(memb => {
      if (balances[memb] !== undefined) {
        balances[memb] -= individualShare;
      }
    });
  });

  // Round balances to clean numbers
  members.forEach(m => {
    balances[m] = Math.round(balances[m]);
    // Prevent -0
    if (Object.is(balances[m], -0)) balances[m] = 0;
  });

  // Calculate settlements using a greedy debtor/creditor matcher
  const debtList = Object.entries(balances)
    .map(([name, bal]) => ({ name, bal }))
    .filter(x => Math.abs(x.bal) > 0.1);

  const debtors = debtList.filter(x => x.bal < 0).map(x => ({ name: x.name, bal: -x.bal }));
  const creditors = debtList.filter(x => x.bal > 0).map(x => ({ name: x.name, bal: x.bal }));

  // Sort: highest values first for standard greedy optimization
  debtors.sort((a, b) => b.bal - a.bal);
  creditors.sort((a, b) => b.bal - a.bal);

  const settlements: Settlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const toSettle = Math.min(debtor.bal, creditor.bal);
    if (toSettle > 0.05) {
      settlements.push({
        id: `set-${dIdx}-${cIdx}-${toSettle}`,
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(toSettle)
      });
    }

    debtor.bal -= toSettle;
    creditor.bal -= toSettle;

    if (debtor.bal <= 0.1) dIdx++;
    if (creditor.bal <= 0.1) cIdx++;
  }

  return { balances, settlements };
}
