import {
  CONFIG_DEFAULTS,
  CONFIG_FIELDS,
  NumberField,
  coerceField,
  normaliseConfig,
} from './config.schema';

const numberField = (over: Partial<NumberField> = {}): NumberField => ({
  key: 'x',
  kind: 'number',
  label: 'X',
  hint: '',
  default: 10,
  min: 1,
  max: 100,
  ...over,
});

describe('config schema', () => {
  it('derives a default for every field', () => {
    for (const field of CONFIG_FIELDS) {
      expect(CONFIG_DEFAULTS[field.key]).toBe(field.default);
    }
  });

  it('every field key is unique', () => {
    const keys = CONFIG_FIELDS.map((f) => f.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  describe('coerceField', () => {
    it('rounds and clamps a number to its range', () => {
      const field = numberField({ min: 5, max: 20 });

      expect(coerceField(field, '30')).toBe(20);
      expect(coerceField(field, '2')).toBe(5);
      expect(coerceField(field, '12.6')).toBe(13);
    });

    it('falls back to the default for a non-number', () => {
      expect(coerceField(numberField(), 'not-a-number')).toBe(10);
    });

    it('trims and caps text, falling back when empty', () => {
      const field = {
        key: 't',
        kind: 'text' as const,
        label: 'T',
        hint: '',
        default: '/about',
        maxLength: 4,
      };

      expect(coerceField(field, '  hello  ')).toBe('hell');
      expect(coerceField(field, '   ')).toBe('/about');
    });
  });

  describe('normaliseConfig', () => {
    it('fills missing keys with defaults and coerces present ones', () => {
      const result = normaliseConfig({ 'security.maxLoginAttempts': '999' });

      expect(result['security.maxLoginAttempts']).toBe(50);
      expect(result['recovery.resetLinkMinutes']).toBe(
        CONFIG_DEFAULTS['recovery.resetLinkMinutes'],
      );
    });

    it('ignores keys not in the schema', () => {
      const result = normaliseConfig({ 'not.a.key': 5 });

      expect('not.a.key' in result).toBe(false);
    });
  });
});
