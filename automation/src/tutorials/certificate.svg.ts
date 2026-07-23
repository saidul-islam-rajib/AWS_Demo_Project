export const CERTIFICATE_WIDTH = 2000;

export const CERTIFICATE_HEIGHT = 1414;

export interface CertificateFields {
  holder: string;
  contact: string;
  course: string;
  detail: string;
  issued: string;
  author: string;
  reference: string;
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function fitText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function certificateSvg(fields: CertificateFields): string {
  const mid = CERTIFICATE_WIDTH / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="48" y="48" width="${CERTIFICATE_WIDTH - 96}" height="${CERTIFICATE_HEIGHT - 96}" fill="none" stroke="#0f766e" stroke-width="8" rx="28"/>
  <rect x="76" y="76" width="${CERTIFICATE_WIDTH - 152}" height="${CERTIFICATE_HEIGHT - 152}" fill="none" stroke="#0f766e" stroke-width="2" rx="16"/>

  <text x="${mid}" y="290" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="34" letter-spacing="12" fill="#0f766e" font-weight="bold">CERTIFICATE OF COMPLETION</text>

  <text x="${mid}" y="450" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="34" fill="#6b7280">This certifies that</text>

  <text x="${mid}" y="590" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="104" fill="#111827">${xml(fitText(fields.holder, 34))}</text>

  ${
    fields.contact
      ? `<text x="${mid}" y="650" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#9ca3af">${xml(fitText(fields.contact, 48))}</text>`
      : ''
  }

  <text x="${mid}" y="790" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="34" fill="#6b7280">has completed</text>

  <text x="${mid}" y="900" text-anchor="middle" font-family="DejaVu Serif, Georgia, serif" font-size="76" fill="#0f766e">${xml(fitText(fields.course, 40))}</text>

  <text x="${mid}" y="970" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#6b7280">${xml(fields.detail)}</text>

  <line x1="300" y1="1130" x2="${CERTIFICATE_WIDTH - 300}" y2="1130" stroke="#e5e7eb" stroke-width="2"/>

  <text x="360" y="1200" text-anchor="start" font-family="DejaVu Sans, sans-serif" font-size="22" letter-spacing="4" fill="#9ca3af">ISSUED</text>
  <text x="360" y="1245" text-anchor="start" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#374151">${xml(fields.issued)}</text>

  <text x="${mid}" y="1200" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="22" letter-spacing="4" fill="#9ca3af">BY</text>
  <text x="${mid}" y="1245" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#374151">${xml(fitText(fields.author, 28))}</text>

  <text x="${CERTIFICATE_WIDTH - 360}" y="1200" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="22" letter-spacing="4" fill="#9ca3af">REFERENCE</text>
  <text x="${CERTIFICATE_WIDTH - 360}" y="1245" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="28" fill="#374151">${xml(fields.reference)}</text>
</svg>`;
}
