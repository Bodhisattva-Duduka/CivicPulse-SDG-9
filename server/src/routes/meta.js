import { Router } from 'express';
import { CATEGORIES, CATEGORY_TO_DEPARTMENT, DEPARTMENTS } from '../services/routing.js';

const router = Router();

// GET /api/meta/categories — categories, routing map, severity options
router.get('/categories', (req, res) => {
  res.json({
    categories: CATEGORIES,
    categoryLabels: Object.fromEntries(
      CATEGORIES.map(c => [c, c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')])
    ),
    categoryToDepartment: CATEGORY_TO_DEPARTMENT,
    departments: DEPARTMENTS,
    departmentLabels: {
      PWD: 'Public Works',
      SANITATION: 'Sanitation',
      WATER_BOARD: 'Water Board',
      ELECTRICITY: 'Electricity',
      TRAFFIC_POLICE: 'Traffic Police'
    },
    severities: ['low', 'medium', 'high']
  });
});

export default router;
