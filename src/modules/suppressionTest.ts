export interface SuppressionResult {
  readonly suppressionDepth: number;
  readonly balancePoint: number;
  readonly timestamp: string;
}

export interface SuppressionTestState {
  readonly currentContrast: number;
  readonly step: number;
  readonly responses: readonly { contrast: number; seen: boolean }[];
}

export function createSuppressionTest(): SuppressionTestState {
  return { currentContrast: 0, step: 5, responses: [] };
}

export function advanceContrast(state: SuppressionTestState): SuppressionTestState {
  return { ...state, currentContrast: Math.min(state.currentContrast + state.step, 100) };
}

export function recordResponse(state: SuppressionTestState, seenBoth: boolean): SuppressionTestState {
  return { ...state, responses: [...state.responses, { contrast: state.currentContrast, seen: seenBoth }] };
}

export function computeResult(state: SuppressionTestState): SuppressionResult {
  const firstSeen = state.responses.find(r => r.seen);
  const balancePoint = firstSeen ? firstSeen.contrast : 100;
  return { suppressionDepth: balancePoint, balancePoint, timestamp: new Date().toISOString() };
}
