export type QueryValue = string | number | undefined;

export function withQuery(
  path: string,
  query: Record<string, QueryValue> = {},
): string {
  const pairs = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return pairs.length ? `${path}?${pairs.join('&')}` : path;
}

export interface Route<Params extends readonly string[] = []> {
  readonly template: string;
  path(params: Record<Params[number], string>): string;
}

function fill(template: string, params: Record<string, string>): string {
  return template.replace(/:([A-Za-z]+)/g, (_, name: string) => {
    const value = params[name];

    return value === undefined ? `:${name}` : encodeURIComponent(value);
  });
}

export function route<const Params extends readonly string[] = []>(
  template: string,
): Route<Params> {
  return {
    template,
    path: (params: Record<string, string> = {}) => fill(template, params),
  };
}
