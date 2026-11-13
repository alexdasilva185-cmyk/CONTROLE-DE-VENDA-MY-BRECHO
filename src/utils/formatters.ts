export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_NAMES_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const WEEKDAYS_PT = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (isNaN(value)) return 'R$ 0';
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`;
  }
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0,0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

// Return current date in Brazil (America/Sao_Paulo / Horário de Brasília) as YYYY-MM-DD
export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Return current time in Brazil (America/Sao_Paulo / Horário de Brasília) as HH:mm
export function getCurrentBrazilianTimeString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

export function toSafeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && !isNaN(value)) return String(value);
  return fallback;
}

export function toIsoStringSafe(value: unknown, fallback?: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const maybeTs = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      try {
        const d = maybeTs.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
      } catch {
        // ignore
      }
    }
    const secs = typeof maybeTs.seconds === 'number' ? maybeTs.seconds : maybeTs._seconds;
    if (typeof secs === 'number' && !isNaN(secs)) {
      const d = new Date(secs * 1000);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return fallback ?? new Date().toISOString();
}

export function formatDateBR(dateString: string): string {
  if (typeof dateString !== 'string' || !dateString.includes('-')) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function formatDateFull(dateString: string): string {
  if (typeof dateString !== 'string' || !dateString.includes('-')) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return '';
  const weekday = WEEKDAYS_PT[date.getDay()] || '';
  const monthName = MONTH_NAMES_PT[month - 1] || '';
  return `${weekday}, ${day} de ${monthName}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES_PT[month - 1] || ''} de ${year}`;
}

export function parseBRInputToNumber(text: string): number {
  if (!text) return 0;
  // Clean string keeping only digits, commas and dots
  const clean = text.replace(/[^\d.,]/g, '');
  if (!clean) return 0;

  // If contains comma, replace dots (thousand sep) and comma with dot
  if (clean.includes(',')) {
    const standardized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(standardized);
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
