export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN') : '—';

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN').format(value ?? 0);
