export const RAW = Symbol('raw-html');

export interface SafeHtml {
  readonly [RAW]: string;
}

export type Renderable =
  SafeHtml | string | number | boolean | null | undefined | Renderable[];

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escape(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

export function isSafe(value: unknown): value is SafeHtml {
  return typeof value === 'object' && value !== null && RAW in value;
}

export function raw(value: string): SafeHtml {
  return { [RAW]: value };
}

export function toHtml(value: Renderable): string {
  if (value === null || value === undefined || value === false) return '';
  if (value === true) return '';
  if (isSafe(value)) return value[RAW];
  if (Array.isArray(value)) return value.map(toHtml).join('');

  return escape(value);
}

export function html(
  strings: TemplateStringsArray,
  ...values: Renderable[]
): SafeHtml {
  let out = strings[0];

  for (let i = 0; i < values.length; i += 1) {
    out += toHtml(values[i]) + strings[i + 1];
  }

  return raw(out);
}

export function join(
  items: Renderable[],
  separator: Renderable = '',
): SafeHtml {
  const glue = toHtml(separator);

  return raw(items.map(toHtml).filter(Boolean).join(glue));
}

export function when(condition: unknown, then: () => Renderable): SafeHtml {
  return condition ? raw(toHtml(then())) : raw('');
}
