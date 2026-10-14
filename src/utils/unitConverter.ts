import type { ExpiryInfo } from '../types/index.ts';

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Check if two units can be merged and convert to preferred display unit
export function mergeAmounts(
  amount1: number,
  unit1: string,
  amount2: number,
  unit2: string
): { amount: number; unit: string } | null {
  const u1 = unit1.trim().toLowerCase();
  const u2 = unit2.trim().toLowerCase();

  if (u1 === u2) {
    return { amount: roundNumber(amount1 + amount2), unit: unit1 };
  }

  // Weight: g and kg
  if ((u1 === 'g' || u1 === 'gram') && (u2 === 'kg' || u2 === 'kilo')) {
    const totalG = amount1 + amount2 * 1000;
    if (totalG >= 1000) {
      return { amount: roundNumber(totalG / 1000), unit: 'kg' };
    }
    return { amount: roundNumber(totalG), unit: 'g' };
  }
  if ((u1 === 'kg' || u1 === 'kilo') && (u2 === 'g' || u2 === 'gram')) {
    const totalG = amount1 * 1000 + amount2;
    if (totalG >= 1000) {
      return { amount: roundNumber(totalG / 1000), unit: 'kg' };
    }
    return { amount: roundNumber(totalG), unit: 'g' };
  }

  // Volume: ml, cl, dl, l
  const volumeToMl = (amt: number, u: string): number | null => {
    switch (u) {
      case 'ml': return amt;
      case 'cl': return amt * 10;
      case 'dl': return amt * 100;
      case 'l':
      case 'liter': return amt * 1000;
      default: return null;
    }
  };

  const v1 = volumeToMl(amount1, u1);
  const v2 = volumeToMl(amount2, u2);

  if (v1 !== null && v2 !== null) {
    const totalMl = v1 + v2;
    if (totalMl >= 1000) {
      return { amount: roundNumber(totalMl / 1000), unit: 'l' };
    } else if (totalMl >= 100) {
      return { amount: roundNumber(totalMl / 100), unit: 'dl' };
    }
    return { amount: roundNumber(totalMl), unit: 'ml' };
  }

  // Different non-convertible units (e.g. "stk" vs "g")
  return null;
}

function roundNumber(num: number): number {
  return Math.round(num * 100) / 100;
}

// Calculate days remaining to expiry and return status
export function getExpiryInfo(expiryDateStr?: string): ExpiryInfo {
  if (!expiryDateStr) {
    return {
      status: 'none',
      daysRemaining: null,
      label: 'Ingen dato',
      colorClass: 'text-slate-400 dark:text-slate-500',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = expiryDateStr.split('-');
  if (parts.length !== 3) {
    return {
      status: 'none',
      daysRemaining: null,
      label: 'Ugyldig dato',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-500'
    };
  }

  const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: 'expired',
      daysRemaining: diffDays,
      label: `Utløpt for ${absDays} ${absDays === 1 ? 'dag' : 'dager'} siden`,
      colorClass: 'text-red-600 dark:text-red-400 font-semibold',
      badgeBg: 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
    };
  } else if (diffDays === 0) {
    return {
      status: 'expired',
      daysRemaining: 0,
      label: 'Går ut i dag!',
      colorClass: 'text-red-600 dark:text-red-400 font-bold',
      badgeBg: 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse'
    };
  } else if (diffDays <= 3) {
    return {
      status: 'warning',
      daysRemaining: diffDays,
      label: `Utløper om ${diffDays} ${diffDays === 1 ? 'dag' : 'dager'}`,
      colorClass: 'text-amber-600 dark:text-amber-400 font-semibold',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    };
  } else {
    return {
      status: 'ok',
      daysRemaining: diffDays,
      label: `Går ut om ${diffDays} dager`,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }
}

// Estimate default shelf-life in days based on food type
export function estimateDefaultShelfLifeDays(name: string, category?: string): number {
  const n = normalizeName(name);

  // Meat / fish: short
  if (
    n.includes('kjøtt') || n.includes('kylling') || n.includes('fisk') ||
    n.includes('laks') || n.includes('torsk') || n.includes('karbonade') ||
    n.includes('biff') || n.includes('pølse') || n.includes('kvernet')
  ) {
    return 4;
  }

  // Dairy: medium
  if (
    n.includes('melk') || n.includes('fløte') || n.includes('rømme') ||
    n.includes('yoghurt') || n.includes('cottage') || n.includes('kesam')
  ) {
    return 8;
  }
  if (n.includes('ost') || n.includes('smør')) {
    return 21;
  }
  if (n.includes('egg')) {
    return 28;
  }

  // Fresh greens & fruits: 5-7 days
  if (
    n.includes('salat') || n.includes('agurk') || n.includes('tomat') ||
    n.includes('avokado') || n.includes('paprika') || n.includes('spinat') ||
    n.includes('banan') || n.includes('bær') || n.includes('jordbær')
  ) {
    return 5;
  }
  if (
    n.includes('potet') || n.includes('gulrot') || n.includes('løk') ||
    n.includes('kål') || n.includes('eple')
  ) {
    return 14;
  }

  // Freezer
  if (category === 'Fryser') {
    return 90;
  }

  // Dry pantry goods: long
  if (
    category === 'Tørrvare' || n.includes('pasta') || n.includes('spagetti') ||
    n.includes('spaghetti') || n.includes('makaroni') || n.includes('nudler') ||
    n.includes('ris') || n.includes('mel') || n.includes('sukker') ||
    n.includes('havregryn') || n.includes('boks') || n.includes('hermetikk') ||
    n.includes('krydder') || n.includes('olje') || n.includes('buljong')
  ) {
    return 180;
  }

  // General default: 7 days
  return 7;
}

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToDate(baseDate: Date, days: number): string {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return formatDateToISO(result);
}

export function formatNorwegianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
