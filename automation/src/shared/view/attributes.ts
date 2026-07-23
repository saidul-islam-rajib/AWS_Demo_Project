import { SafeHtml, escape, raw } from './html';

export type ClassValue =
  string | false | null | undefined | Record<string, boolean> | ClassValue[];

export function classes(...values: ClassValue[]): string {
  const names: string[] = [];

  const walk = (value: ClassValue): void => {
    if (!value) return;

    if (typeof value === 'string') {
      names.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else {
      for (const [name, on] of Object.entries(value)) {
        if (on) names.push(name);
      }
    }
  };

  values.forEach(walk);

  return names.join(' ');
}

export type AttributeValue = string | number | boolean | null | undefined;

export function attributes(map: Record<string, AttributeValue>): SafeHtml {
  const parts: string[] = [];

  for (const [name, value] of Object.entries(map)) {
    if (value === null || value === undefined || value === false) continue;

    if (value === true) {
      parts.push(name);
    } else {
      parts.push(`${name}="${escape(value)}"`);
    }
  }

  return raw(parts.length ? ` ${parts.join(' ')}` : '');
}
