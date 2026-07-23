import { AttributeValue, ClassValue, attributes, classes } from './attributes';
import { Renderable, SafeHtml, html, join, when } from './html';

export type Tone = 'accent' | 'good' | 'warn' | 'danger' | 'muted';

export interface PillView {
  label: string;
  tone: Tone;
}

export function pill({ label, tone }: PillView): SafeHtml {
  const cls = classes('ui-pill', `ui-pill--${tone}`);

  return html`<span class="${cls}">${label}</span>`;
}

export type BannerKind = 'ok' | 'error' | 'info';

export interface BannerView {
  kind: BannerKind;
  message: Renderable;
}

export function banner({ kind, message }: BannerView): SafeHtml {
  const role = kind === 'error' ? 'alert' : 'status';

  return html`<p
    class="${classes('ui-banner', `ui-banner--${kind}`)}"
    role="${role}"
  >
    ${message}
  </p>`;
}

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface LinkButton {
  href: string;
  label: Renderable;
  variant?: ButtonVariant;
  attrs?: Record<string, AttributeValue>;
}

export function linkButton({
  href,
  label,
  variant = 'primary',
  attrs = {},
}: LinkButton): SafeHtml {
  return html`<a
    class="${buttonClass(variant)}"
    href="${href}"
    ${attributes(attrs)}
    >${label}</a
  >`;
}

export interface SubmitButton {
  label: Renderable;
  variant?: ButtonVariant;
  attrs?: Record<string, AttributeValue>;
}

export function submitButton({
  label,
  variant = 'primary',
  attrs = {},
}: SubmitButton): SafeHtml {
  return html`<button
    type="submit"
    class="${buttonClass(variant)}"
    ${attributes(attrs)}
  >
    ${label}
  </button>`;
}

function buttonClass(variant: ButtonVariant): string {
  return classes('btn', {
    'btn-primary': variant === 'primary',
    'btn-ghost': variant === 'ghost',
    'btn-danger': variant === 'danger',
  });
}

export interface FieldView {
  name: string;
  label: Renderable;
  type?: string;
  value?: string;
  hint?: Renderable;
  required?: boolean;
  autocomplete?: string;
  placeholder?: string;
  attrs?: Record<string, AttributeValue>;
}

export function field({
  name,
  label,
  type = 'text',
  value = '',
  hint,
  required = false,
  autocomplete,
  placeholder,
  attrs = {},
}: FieldView): SafeHtml {
  const id = `field-${name}`;

  return html`<div class="ui-field">
    <label for="${id}">${label}</label>
    <input${attributes({
      type,
      id,
      name,
      value: value || undefined,
      required,
      autocomplete,
      placeholder,
      ...attrs,
    })} />
    ${when(hint, () => html`<p class="ui-hint">${hint}</p>`)}
  </div>`;
}

export interface PanelView {
  title?: Renderable;
  body: Renderable;
  tone?: 'plain' | 'accent';
  attrs?: Record<string, AttributeValue>;
}

export function panel({
  title,
  body,
  tone = 'plain',
  attrs = {},
}: PanelView): SafeHtml {
  return html`<section
    class="${classes('ui-panel', { 'ui-panel--accent': tone === 'accent' })}"
    ${attributes(attrs)}
  >
    ${when(title, () => html`<h3 class="ui-panel__title">${title}</h3>`)}
    ${body}
  </section>`;
}

export interface Column<Row> {
  header: Renderable;
  cell(row: Row): Renderable;
  align?: 'start' | 'end';
}

export interface TableView<Row> {
  columns: Column<Row>[];
  rows: Row[];
  empty: Renderable;
}

export function table<Row>({ columns, rows, empty }: TableView<Row>): SafeHtml {
  if (rows.length === 0) return emptyState(empty);

  return html`<div class="ui-table-wrap">
    <table class="ui-table">
      <thead>
        <tr>
          ${join(
            columns.map(
              (column) =>
                html`<th
                  class="${classes({ 'is-end': column.align === 'end' })}"
                >
                  ${column.header}
                </th>`,
            ),
          )}
        </tr>
      </thead>
      <tbody>
        ${join(
          rows.map(
            (row) =>
              html`<tr>
                ${join(
                  columns.map(
                    (column) =>
                      html`<td
                        class="${classes({ 'is-end': column.align === 'end' })}"
                      >
                        ${column.cell(row)}
                      </td>`,
                  ),
                )}
              </tr>`,
          ),
        )}
      </tbody>
    </table>
  </div>`;
}

export function emptyState(message: Renderable): SafeHtml {
  return html`<div class="ui-empty">${message}</div>`;
}

export interface ToolbarView {
  title: Renderable;
  subtitle?: Renderable;
  back?: { href: string; label: Renderable };
  actions?: Renderable;
}

export function toolbar({
  title,
  subtitle,
  back,
  actions,
}: ToolbarView): SafeHtml {
  return html`<div class="ui-toolbar">
    <div>
      ${when(back, () => html`<a class="ui-back" href="${back!.href}">${back!.label}</a>`)}
      <h1 class="ui-toolbar__title">${title}</h1>
      ${when(subtitle, () => html`<p class="ui-toolbar__sub">${subtitle}</p>`)}
    </div>
    ${when(actions, () => html`<div class="ui-toolbar__actions">${actions}</div>`)}
  </div>`;
}

export interface CodeBlockView {
  id: string;
  value: Renderable;
  copyLabel?: string;
}

export function codeBlock({
  id,
  value,
  copyLabel = 'Copy',
}: CodeBlockView): SafeHtml {
  return html`<p class="ui-code" id="${id}">${value}</p>
    <p class="ui-copy-row">
      <button type="button" class="ui-copy" data-copy="${id}">
        ${copyLabel}
      </button>
    </p>`;
}

export function classNames(...values: ClassValue[]): string {
  return classes(...values);
}
