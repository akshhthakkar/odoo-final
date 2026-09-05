import { describe, it, expect } from 'vitest';
import { numberToIndianWords } from '../src/modules/payroll-run/number-to-words.js';

describe('numberToIndianWords', () => {
  it('converts 0 to Zero Rupees Only', () => {
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
  });

  it('converts 99 to Ninety Nine Rupees Only', () => {
    expect(numberToIndianWords(99)).toBe('Ninety Nine Rupees Only');
  });

  it('converts 100 to One Hundred Rupees Only', () => {
    expect(numberToIndianWords(100)).toBe('One Hundred Rupees Only');
  });

  it('converts 55000 to Fifty Five Thousand Rupees Only', () => {
    expect(numberToIndianWords(55000)).toBe('Fifty Five Thousand Rupees Only');
  });

  it('converts 126000 to One Lakh Twenty Six Thousand Rupees Only', () => {
    expect(numberToIndianWords(126000)).toBe('One Lakh Twenty Six Thousand Rupees Only');
  });

  it('converts 12345678.50 to Crores, Lakhs, Thousands, Hundreds, Rupees and Fifty Paise', () => {
    expect(numberToIndianWords(12345678.5)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees and Fifty Paise Only'
    );
  });

  it('handles paise only e.g. 0.75', () => {
    expect(numberToIndianWords(0.75)).toBe('Seventy Five Paise Only');
  });

  it('handles negative amounts defensively with Minus prefix', () => {
    expect(numberToIndianWords(-5000)).toBe('Minus Five Thousand Rupees Only');
  });
});
