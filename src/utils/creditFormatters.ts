import { CustomerCredit } from '../types/credits';
import { formatCurrency, formatDateBR, toIsoStringSafe, toSafeString } from './formatters';

// Cleans phone for WhatsApp URL (ensuring country code 55 if not present)
export function cleanWhatsAppNumber(phone: string): string {
  const digits = toSafeString(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

// Format phone for visual display: (XX) XXXXX-XXXX
export function formatPhoneVisual(phone: string): string {
  const safePhone = toSafeString(phone);
  const digits = safePhone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return safePhone;
}

// 1. Mensagem de Emissão / Saldo Inicial do Vale-Crédito
export function generateNewCreditWhatsAppText(
  credit: CustomerCredit,
  businessName: string = 'MY Brechó'
): string {
  const createdDate = toIsoStringSafe(credit.createdAt).split('T')[0];
  return [
    `👗 *${toSafeString(businessName, 'MY Brechó').toUpperCase()} - SEU VALE-CRÉDITO* ✨`,
    `Olá, *${toSafeString(credit.customerName, 'Cliente')}*! Tudo bem?`,
    ``,
    `Registramos o seu crédito para compras no brechó:`,
    `💰 *Valor Disponível:* *${formatCurrency(credit.remainingAmount)}*`,
    credit.description ? `📝 *Referente a:* ${credit.description}` : '',
    `📅 *Data de Emissão:* ${formatDateBR(createdDate)}`,
    ``,
    `Você pode utilizar esse saldo quando vier nos visitar para escolher suas peças!`,
    `Qualquer dúvida estamos à disposição. Te esperamos! 💕🛍️`,
  ]
    .filter(Boolean)
    .join('\n');
}

// 2. Mensagem de Abatimento Parcial (usou parte do crédito)
export function generateCreditDeductionWhatsAppText(
  credit: CustomerCredit,
  deductedAmount: number,
  businessName: string = 'MY Brechó'
): string {
  return [
    `👗 *${businessName.toUpperCase()} - ATUALIZAÇÃO DO SEU CRÉDITO* ✨`,
    `Olá, *${credit.customerName}*! Tudo bem?`,
    ``,
    `Você utilizou parte do seu crédito hoje:`,
    `🔻 *Valor Utilizado Hoje:* ${formatCurrency(deductedAmount)}`,
    `💰 *Saldo Restante Disponível:* *${formatCurrency(credit.remainingAmount)}*`,
    `📅 *Data:* ${formatDateBR(new Date().toISOString().split('T')[0])}`,
    ``,
    `Aproveite o saldo que restou nas suas próximas visitas! 💕🛍️`,
  ].join('\n');
}

// 3. Mensagem de Crédito 100% Utilizado / Finalizado
export function generateCreditCompletedWhatsAppText(
  credit: CustomerCredit,
  businessName: string = 'MY Brechó'
): string {
  return [
    `👗 *${businessName.toUpperCase()} - CRÉDITO FINALIZADO* ✨`,
    `Olá, *${credit.customerName}*! Tudo bem?`,
    ``,
    `Confirmamos que o seu crédito foi totalmente utilizado na sua compra de hoje:`,
    `✅ *Valor Total Utilizado:* ${formatCurrency(credit.initialAmount)}`,
    `💰 *Saldo Restante:* *R$ 0,00 (Crédito encerrado)*`,
    `📅 *Data de Conclusão:* ${formatDateBR(new Date().toISOString().split('T')[0])}`,
    ``,
    `Muito obrigado pela preferência e pelas compras! Adoramos ter você aqui no brechó. Volte sempre! 💕🛍️✨`,
  ].join('\n');
}

// Open WhatsApp with pre-filled text
export function openWhatsApp(phone: string, text: string): void {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}
