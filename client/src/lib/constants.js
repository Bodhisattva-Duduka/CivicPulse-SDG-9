// Categories, departments, routing — mirrored from server §6

export const CATEGORIES = [
  'pothole', 'broken_footpath', 'damaged_road_divider', 'collapsed_culvert',
  'garbage_overflow', 'illegal_dumping', 'uncollected_trash', 'blocked_drain',
  'pipe_leak', 'contaminated_water', 'sewage_overflow', 'manhole_issue',
  'streetlight_outage', 'exposed_wiring', 'damaged_transformer',
  'broken_traffic_signal', 'faded_road_marking', 'illegal_parking'
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map(c => [c, c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')])
);

export const CATEGORY_TO_DEPARTMENT = {
  pothole: 'PWD',
  broken_footpath: 'PWD',
  damaged_road_divider: 'PWD',
  collapsed_culvert: 'PWD',
  garbage_overflow: 'SANITATION',
  illegal_dumping: 'SANITATION',
  uncollected_trash: 'SANITATION',
  blocked_drain: 'SANITATION',
  pipe_leak: 'WATER_BOARD',
  contaminated_water: 'WATER_BOARD',
  sewage_overflow: 'WATER_BOARD',
  manhole_issue: 'WATER_BOARD',
  streetlight_outage: 'ELECTRICITY',
  exposed_wiring: 'ELECTRICITY',
  damaged_transformer: 'ELECTRICITY',
  broken_traffic_signal: 'TRAFFIC_POLICE',
  faded_road_marking: 'TRAFFIC_POLICE',
  illegal_parking: 'TRAFFIC_POLICE'
};

export const DEPARTMENTS = ['PWD', 'SANITATION', 'WATER_BOARD', 'ELECTRICITY', 'TRAFFIC_POLICE'];

export const DEPARTMENT_LABELS = {
  PWD: 'Public Works',
  SANITATION: 'Sanitation',
  WATER_BOARD: 'Water Board',
  ELECTRICITY: 'Electricity',
  TRAFFIC_POLICE: 'Traffic Police'
};

export const STATUSES = ['New', 'Acknowledged', 'In Progress', 'Resolved'];

export const STATUS_COLORS = {
  'New': 'var(--color-status-new)',
  'Acknowledged': 'var(--color-status-acknowledged)',
  'In Progress': 'var(--color-status-inprogress)',
  'Resolved': 'var(--color-status-resolved)',
  'Overdue': 'var(--color-status-overdue)'
};

export const SEVERITY_COLORS = {
  low: 'var(--color-severity-low)',
  medium: 'var(--color-severity-medium)',
  high: 'var(--color-severity-high)'
};

// Category icon names (lucide-react)
export const CATEGORY_ICONS = {
  pothole: 'Construction',
  broken_footpath: 'Footprints',
  damaged_road_divider: 'Milestone',
  collapsed_culvert: 'Waves',
  garbage_overflow: 'Trash2',
  illegal_dumping: 'PackageX',
  uncollected_trash: 'Trash',
  blocked_drain: 'CloudDrizzle',
  pipe_leak: 'Droplet',
  contaminated_water: 'FlaskConical',
  sewage_overflow: 'Droplets',
  manhole_issue: 'Circle',
  streetlight_outage: 'Lightbulb',
  exposed_wiring: 'Zap',
  damaged_transformer: 'Bolt',
  broken_traffic_signal: 'TrafficCone',
  faded_road_marking: 'PaintBucket',
  illegal_parking: 'CarFront'
};

// Department icon names
export const DEPARTMENT_ICONS = {
  PWD: 'Wrench',
  SANITATION: 'Trash2',
  WATER_BOARD: 'Droplet',
  ELECTRICITY: 'Zap',
  TRAFFIC_POLICE: 'TrafficCone'
};
