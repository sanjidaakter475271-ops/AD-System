import { BASE_UNITS } from './constants';

export function getBaseCode(baseName: string): string {
  if (!baseName) return '01';
  const idx = BASE_UNITS.findIndex(
    b => b.toLowerCase() === baseName.trim().toLowerCase()
  );
  if (idx !== -1) {
    return (idx + 1).toString().padStart(2, '0');
  }
  return '01';
}

/**
 * Generate Unique System Control Code for equipment
 * Example: Base = Air HQ (01), SN = 1 => CU01001
 * Example: Base = BAF BBD (02), SN = 14 => CU02014
 */
export function formatEquipmentCode(baseName: string, sn: number | string): string {
  const code = getBaseCode(baseName);
  const num = typeof sn === 'number' ? sn : parseInt(sn) || 1;
  const paddedNum = num.toString().padStart(3, '0');
  return `CU${code}${paddedNum}`;
}
