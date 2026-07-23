import { Tone } from '../shared/view/components';

export enum ResetState {
  Live = 'live',
  Used = 'used',
  Revoked = 'revoked',
  Expired = 'expired',
}

export interface ResetStateDescriptor {
  label: string;
  tone: Tone;
}

export const RESET_STATE_DESCRIPTORS: Record<ResetState, ResetStateDescriptor> =
  {
    [ResetState.Live]: { label: 'Waiting to be used', tone: 'warn' },
    [ResetState.Used]: { label: 'Used', tone: 'good' },
    [ResetState.Revoked]: { label: 'Revoked', tone: 'muted' },
    [ResetState.Expired]: { label: 'Expired', tone: 'muted' },
  };

export function describeResetState(state: ResetState): ResetStateDescriptor {
  return RESET_STATE_DESCRIPTORS[state];
}
