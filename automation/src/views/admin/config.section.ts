import {
  CONFIG_GROUPS,
  ConfigField,
  ConfigValues,
} from '../../shared/config/config.schema';
import { attributes } from '../../shared/view/attributes';
import { SafeHtml, html, join } from '../../shared/view/html';
import { submitButton } from '../../shared/view/components';

function control(field: ConfigField, value: number | string): SafeHtml {
  const id = `cfg-${field.key}`;

  const input =
    field.kind === 'number'
      ? html`<input${attributes({
          type: 'number',
          id,
          name: field.key,
          value: String(value),
          min: field.min,
          max: field.max,
          step: 1,
          required: true,
        })} />`
      : html`<input${attributes({
          type: 'text',
          id,
          name: field.key,
          value: String(value),
          maxlength: field.maxLength,
        })} />`;

  const unit = field.kind === 'number' && field.unit ? field.unit : '';

  return html`<div class="cfg-field">
    <label for="${id}">${field.label}</label>
    <div class="cfg-input">
      ${input} ${unit ? html`<span class="cfg-unit">${unit}</span>` : ''}
    </div>
    <p class="ui-hint">${field.hint}</p>
  </div>`;
}

export function configSection(values: ConfigValues): SafeHtml {
  return html`<form method="post" action="/admin/settings/config" id="config">
    ${join(
      CONFIG_GROUPS.map(
        (group) =>
          html`<details class="card-block" open data-panel="cfg-${group.id}">
            <summary>${group.title}</summary>
            <p class="cfg-note">${group.description}</p>
            <div class="cfg-grid">
              ${join(group.fields.map((field) => control(field, values[field.key])))}
            </div>
          </details>`,
      ),
    )}
    <div class="cfg-save">${submitButton({ label: 'Save configuration' })}</div>
  </form>`;
}

export const CONFIG_SECTION_CSS = `
.cfg-note { font-size: 0.83rem; color: var(--ink-3); margin-bottom: 1rem; line-height: 1.5; }
.cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.cfg-field label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--ink-2); margin-bottom: 0.3rem; }
.cfg-input { display: flex; align-items: center; gap: 0.5rem; }
.cfg-input input { flex: 1; }
.cfg-unit { font-size: 0.8rem; color: var(--ink-3); white-space: nowrap; }
.cfg-save { margin-top: 1.25rem; }
`;
