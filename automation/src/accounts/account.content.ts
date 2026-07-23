export interface AccountBenefit {
  icon: string;
  title: string;
  detail: string;
}

export const ACCOUNT_BENEFITS: AccountBenefit[] = [
  {
    icon: '✓',
    title: 'Progress that follows you',
    detail:
      'Lessons you finish are kept on your account, not in one browser, so you can carry on from any device.',
  },
  {
    icon: '★',
    title: 'One certificate per course',
    detail:
      'A certificate is issued to you rather than to a browser, with a reference that never changes.',
  },
  {
    icon: '⚿',
    title: 'A way back in',
    detail:
      'You get a recovery code at sign-up, and can swap it for a fresh one whenever you are signed in. Nothing is emailed to you and your address is never shared.',
  },
];

export interface AccountStep {
  title: string;
  detail: string;
}

export const REGISTRATION_STEPS: AccountStep[] = [
  {
    title: 'Create your account',
    detail: 'Name, email and a password. That is the whole form.',
  },
  {
    title: 'Save your recovery code',
    detail:
      'Shown once, straight after. Lost it later? Ask for a new one from your account page.',
  },
  {
    title: 'Start learning',
    detail:
      'You are signed in already, and stay signed in as long as your session lasts.',
  },
];
