import { Router } from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import {
  createComplaint,
  getPublicComplaints,
  getNearbyComplaints,
  getMyComplaints,
  upvoteComplaint,
  getDepartmentComplaints,
  updateComplaintStatus,
  getComplaint
} from '../controllers/complaintsController.js';

const router = Router();

// Public routes
router.get('/public', getPublicComplaints);
router.get('/nearby', getNearbyComplaints);

// Citizen routes
router.post('/', auth, createComplaint);
router.get('/mine', auth, getMyComplaints);
router.post('/:id/upvote', auth, upvoteComplaint);

// Department routes
router.get('/department', auth, requireRole('department', 'admin'), getDepartmentComplaints);
router.patch('/:id/status', auth, requireRole('department', 'admin'), updateComplaintStatus);

// Public detail (must be last to avoid matching /public, /mine, etc.)
router.get('/:id', getComplaint);

export default router;
