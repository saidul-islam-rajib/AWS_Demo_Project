export type ConfigFieldKind = 'number' | 'text';

export interface NumberField {
  key: string;
  kind: 'number';
  label: string;
  hint: string;
  default: number;
  min: number;
  max: number;
  unit?: string;
}

export interface TextField {
  key: string;
  kind: 'text';
  label: string;
  hint: string;
  default: string;
  maxLength: number;
}

export type ConfigField = NumberField | TextField;

export interface ConfigGroup {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    id: 'security',
    title: 'Security & rate limiting',
    description:
      'How sign-in is protected and how long a session lasts. Applies to the admin and to learner accounts.',
    fields: [
      {
        key: 'security.maxLoginAttempts',
        kind: 'number',
        label: 'Failed attempts before lockout',
        hint: 'Wrong passwords from one address before it is locked out.',
        default: 5,
        min: 1,
        max: 50,
        unit: 'attempts',
      },
      {
        key: 'security.lockoutMinutes',
        kind: 'number',
        label: 'Lockout length',
        hint: 'How long a locked-out address must wait.',
        default: 15,
        min: 1,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'security.attemptWindowMinutes',
        kind: 'number',
        label: 'Attempt window',
        hint: 'Failures older than this are forgotten.',
        default: 15,
        min: 1,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'security.sessionDays',
        kind: 'number',
        label: 'Learner session length',
        hint: 'How long a signed-in learner stays signed in.',
        default: 30,
        min: 1,
        max: 365,
        unit: 'days',
      },
    ],
  },
  {
    id: 'recovery',
    title: 'Account recovery',
    description:
      'Recovery codes, and the one-time reset the owner can issue when a learner has lost both password and code.',
    fields: [
      {
        key: 'recovery.resetLinkMinutes',
        kind: 'number',
        label: 'Reset link lifetime',
        hint: 'How long an owner-issued reset code stays usable.',
        default: 60,
        min: 5,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'recovery.resetHistoryDepth',
        kind: 'number',
        label: 'Reset history kept',
        hint: 'How many past resets to keep per account for the audit trail.',
        default: 10,
        min: 1,
        max: 100,
        unit: 'entries',
      },
      {
        key: 'recovery.codeGroups',
        kind: 'number',
        label: 'Recovery code groups',
        hint: 'Number of dash-separated groups in a recovery code.',
        default: 4,
        min: 2,
        max: 8,
        unit: 'groups',
      },
      {
        key: 'recovery.codeGroupLength',
        kind: 'number',
        label: 'Characters per group',
        hint: 'Length of each group in a recovery code.',
        default: 5,
        min: 3,
        max: 8,
        unit: 'characters',
      },
      {
        key: 'recovery.minPasswordLength',
        kind: 'number',
        label: 'Minimum password length',
        hint: 'Shortest password a learner may choose.',
        default: 8,
        min: 6,
        max: 128,
        unit: 'characters',
      },
    ],
  },
  {
    id: 'content',
    title: 'Content limits',
    description:
      'Pagination and listing sizes across the admin and public pages.',
    fields: [
      {
        key: 'content.adminPageSize',
        kind: 'number',
        label: 'Admin listing page size',
        hint: 'Rows per page in the posts and projects admin tables.',
        default: 10,
        min: 5,
        max: 100,
        unit: 'rows',
      },
      {
        key: 'content.sidebarTagLimit',
        kind: 'number',
        label: 'Sidebar tag limit',
        hint: 'Most-used tags shown in the home sidebar before “see all”.',
        default: 20,
        min: 5,
        max: 100,
        unit: 'tags',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support & contact',
    description:
      'Where a learner who is locked out, or has lost both password and code, is sent to reach a human.',
    fields: [
      {
        key: 'support.channelUrl',
        kind: 'text',
        label: 'Support link',
        hint: 'Where “ask for a reset” and locked-out messages point. A /path or full URL.',
        default: '/about',
        maxLength: 300,
      },
      {
        key: 'support.channelLabel',
        kind: 'text',
        label: 'Support link text',
        hint: 'The wording of that link.',
        default: 'the about page',
        maxLength: 80,
      },
    ],
  },
];

export type ConfigValues = Record<string, number | string>;

export const CONFIG_FIELDS: ConfigField[] = CONFIG_GROUPS.flatMap(
  (group) => group.fields,
);

export const CONFIG_DEFAULTS: ConfigValues = Object.fromEntries(
  CONFIG_FIELDS.map((f) => [f.key, f.default]),
);

export function coerceField(field: ConfigField, raw: unknown): number | string {
  if (field.kind === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) return field.default;

    return Math.min(field.max, Math.max(field.min, Math.round(value)));
  }

  const text = (typeof raw === 'string' ? raw : '').trim();

  return text ? text.slice(0, field.maxLength) : field.default;
}

export function normaliseConfig(input: Partial<ConfigValues>): ConfigValues {
  return Object.fromEntries(
    CONFIG_FIELDS.map((field) => [
      field.key,
      coerceField(field, input[field.key] ?? field.default),
    ]),
  );
}
