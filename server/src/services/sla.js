// SLA deadline computation (§7)

const URGENCY_TIERS = {
  'safety-critical': [
    'exposed_wiring', 'damaged_transformer', 'broken_traffic_signal',
    'manhole_issue', 'sewage_overflow', 'contaminated_water'
  ],
  'standard-infra': [
    'pothole', 'broken_footpath', 'damaged_road_divider', 'collapsed_culvert',
    'pipe_leak', 'streetlight_outage'
  ],
  'lower-urgency': [
    'garbage_overflow', 'illegal_dumping', 'uncollected_trash', 'blocked_drain',
    'faded_road_marking', 'illegal_parking'
  ]
};

const SLA_DAYS = {
  'safety-critical': { high: 1, medium: 3, low: 7 },
  'standard-infra': { high: 3, medium: 7, low: 14 },
  'lower-urgency': { high: 2, medium: 5, low: 10 }
};

export const getUrgencyTier = (category) => {
  for (const [tier, categories] of Object.entries(URGENCY_TIERS)) {
    if (categories.includes(category)) return tier;
  }
  return 'standard-infra'; // default
};

export const computeDeadline = (category, severity, acknowledgedAt) => {
  const tier = getUrgencyTier(category);
  const days = SLA_DAYS[tier][severity] || 7;
  const deadline = new Date(acknowledgedAt);
  deadline.setDate(deadline.getDate() + days);
  return deadline;
};

export const getSLADays = (category, severity) => {
  const tier = getUrgencyTier(category);
  return SLA_DAYS[tier][severity] || 7;
};
