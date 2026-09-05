const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertTwoDigits(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const rest = n % 10;
  return rest > 0 ? `${TENS[ten]} ${ONES[rest]}` : TENS[ten];
}

function convertThreeDigits(n) {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred > 0 && rest > 0) {
    return `${ONES[hundred]} Hundred ${convertTwoDigits(rest)}`;
  }
  if (hundred > 0) {
    return `${ONES[hundred]} Hundred`;
  }
  return convertTwoDigits(rest);
}

function convertIntegerToIndianWords(n) {
  if (n === 0) return 'Zero';

  const parts = [];
  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  if (crore > 0) {
    parts.push(`${convertIntegerToIndianWords(crore)} Crore`);
  }

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }

  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return parts.join(' ');
}

export function numberToIndianWords(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 'Zero Rupees Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  const prefix = isNegative ? 'Minus ' : '';

  if (rupees === 0 && paise === 0) {
    return `${prefix}Zero Rupees Only`;
  }

  const rupeesWords = rupees > 0 ? convertIntegerToIndianWords(rupees) : 'Zero';

  if (paise > 0 && rupees > 0) {
    const paiseWords = convertTwoDigits(paise);
    return `${prefix}${rupeesWords} Rupees and ${paiseWords} Paise Only`;
  }

  if (paise > 0 && rupees === 0) {
    const paiseWords = convertTwoDigits(paise);
    return `${prefix}${paiseWords} Paise Only`;
  }

  return `${prefix}${rupeesWords} Rupees Only`;
}
