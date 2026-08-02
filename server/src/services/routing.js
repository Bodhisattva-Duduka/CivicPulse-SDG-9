// Category → Department routing table (§6)

const CATEGORY_TO_DEPARTMENT = {
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

export const routeToDepartment = (category) => {
  return CATEGORY_TO_DEPARTMENT[category] || 'PWD'; // default to PWD per §6
};

export const CATEGORIES = Object.keys(CATEGORY_TO_DEPARTMENT);
export const DEPARTMENTS = [...new Set(Object.values(CATEGORY_TO_DEPARTMENT))];
export { CATEGORY_TO_DEPARTMENT };
