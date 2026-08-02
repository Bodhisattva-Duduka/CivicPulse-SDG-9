// Priority score computation (§10)
// priorityScore = severityWeight(severity) * 10 + confirmations * 3 + upvotes * 1

const SEVERITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3
};

export const computePriorityScore = (severity, confirmations = 0, upvotes = 0) => {
  const weight = SEVERITY_WEIGHTS[severity] || 1;
  return weight * 10 + confirmations * 3 + upvotes;
};
