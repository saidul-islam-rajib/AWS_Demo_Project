import { RecoveryPolicy } from '../shared/config/policies';

export function normaliseRecoveryCode(value?: string): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatRecoveryCode(raw: string): string {
  const size = RecoveryPolicy.codeGroupLength;
  const groups: string[] = [];

  for (let at = 0; at < raw.length; at += size) {
    groups.push(raw.slice(at, at + size));
  }

  return groups.join('-');
}

export function recoveryCodeShape(): string {
  return Array.from({ length: RecoveryPolicy.codeGroups }, () =>
    'X'.repeat(RecoveryPolicy.codeGroupLength),
  ).join('-');
}

export function hasCodeLength(value?: string): boolean {
  return normaliseRecoveryCode(value).length === RecoveryPolicy.codeLength;
}
