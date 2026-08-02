import Complaint from '../models/Complaint.js';
import { classifyImage } from '../services/classification.js';
import { computeDHashFromUrl, hammingDistance } from '../services/phash.js';
import { routeToDepartment } from '../services/routing.js';
import { computeDeadline } from '../services/sla.js';
import { computePriorityScore } from '../services/priority.js';

// POST /api/complaints — Create complaint with dHash + AI classification + duplicate check
export const createComplaint = async (req, res) => {
  try {
    const { photoUrl, photoPublicId, lat, lng, description } = req.body;

    if (!photoUrl || lat == null || lng == null) {
      return res.status(400).json({ error: 'photoUrl, lat, and lng are required' });
    }

    // Step 1: Compute dHash from the image
    let pHash;
    try {
      pHash = await computeDHashFromUrl(photoUrl);
    } catch (err) {
      console.error('dHash computation failed:', err);
      pHash = null;
    }

    // Step 2: AI classification
    const classification = await classifyImage(photoUrl);
    const { category, severity, confidence } = classification;

    // Step 3: Route to department
    const department = routeToDepartment(category);

    // Step 4: Duplicate detection (§8)
    if (pHash) {
      try {
        const candidates = await Complaint.find({
          category,
          status: { $ne: 'Resolved' },
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [lng, lat] },
              $maxDistance: 50 // 50 meters
            }
          }
        }).limit(50);

        for (const candidate of candidates) {
          if (candidate.pHash) {
            const distance = hammingDistance(pHash, candidate.pHash);
            if (distance <= 10) {
              // It's a duplicate — merge as confirmation
              const updated = await Complaint.findByIdAndUpdate(
                candidate._id,
                {
                  $addToSet: { confirmedBy: req.user.id },
                  $inc: { confirmations: 1 }
                },
                { new: true }
              );

              // Recompute priority score
              const newScore = computePriorityScore(
                updated.severity,
                updated.confirmations,
                updated.upvotes
              );
              updated.priorityScore = newScore;
              await updated.save();

              return res.status(200).json({
                matched: true,
                message: "You've confirmed an existing report",
                complaint: updated
              });
            }
          }
        }
      } catch (err) {
        console.error('Duplicate check failed, proceeding with creation:', err);
      }
    }

    // Step 5: Create new complaint
    const priorityScore = computePriorityScore(severity, 0, 0);

    const complaint = await Complaint.create({
      reporter: req.user.id,
      photoUrl,
      photoPublicId,
      pHash,
      location: { type: 'Point', coordinates: [lng, lat] },
      category,
      severity,
      aiConfidence: confidence,
      description,
      department,
      priorityScore,
      timestamps: { reported: new Date() }
    });

    res.status(201).json({
      matched: false,
      message: 'Report created successfully',
      complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// GET /api/complaints/public — all complaints, omit reporter email
export const getPublicComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('reporter', 'name -_id')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// GET /api/complaints/nearby?lat=&lng=&radius=
export const getNearbyComplaints = async (req, res) => {
  try {
    const { lat, lng, radius = 2500 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    })
      .populate('reporter', 'name -_id')
      .sort({ priorityScore: -1 })
      .lean();

    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby complaints' });
  }
};

// GET /api/complaints/mine
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ reporter: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your complaints' });
  }
};

// POST /api/complaints/:id/upvote
export const upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Check if already upvoted
    if (complaint.upvotedBy.includes(req.user.id)) {
      return res.status(400).json({ error: 'You have already upvoted this report' });
    }

    complaint.upvotedBy.push(req.user.id);
    complaint.upvotes += 1;
    complaint.priorityScore = computePriorityScore(
      complaint.severity,
      complaint.confirmations,
      complaint.upvotes
    );
    await complaint.save();

    res.json({ complaint });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upvote' });
  }
};

// GET /api/complaints/department?status=&sort=&department=
export const getDepartmentComplaints = async (req, res) => {
  try {
    const { status, sort = 'priority', department: deptFilter } = req.query;
    const query = {};

    // Department-role users are scoped to their own department
    if (req.user.role === 'department') {
      query.department = req.user.department;
    } else if (req.user.role === 'admin' && deptFilter) {
      query.department = deptFilter;
    }

    if (status) {
      query.status = status;
    }

    const sortObj = sort === 'priority'
      ? { priorityScore: -1 }
      : sort === 'newest'
        ? { createdAt: -1 }
        : sort === 'deadline'
          ? { deadline: 1 }
          : { priorityScore: -1 };

    const complaints = await Complaint.find(query)
      .populate('reporter', 'name email')
      .sort(sortObj)
      .lean();

    res.json({ complaints });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department complaints' });
  }
};

// PATCH /api/complaints/:id/status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, resolutionNote, categoryOverride, severityOverride, deadlineOverride } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Role check: department user can only update their own department's complaints
    if (req.user.role === 'department' && complaint.department !== req.user.department) {
      return res.status(403).json({ error: 'You can only manage complaints in your department' });
    }

    const validTransitions = {
      'New': ['Acknowledged'],
      'Acknowledged': ['In Progress'],
      'In Progress': ['Resolved']
    };

    if (!validTransitions[complaint.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${complaint.status}" to "${status}"`
      });
    }

    // Apply category/severity overrides
    if (categoryOverride && categoryOverride !== complaint.category) {
      complaint.category = categoryOverride;
      complaint.categoryOverridden = true;
      complaint.department = routeToDepartment(categoryOverride);
    }

    if (severityOverride && severityOverride !== complaint.severity) {
      complaint.severity = severityOverride;
      complaint.severityOverridden = true;
    }

    // Update status
    complaint.status = status;
    const now = new Date();

    if (status === 'Acknowledged') {
      complaint.timestamps.acknowledged = now;
      // Auto-compute deadline per §7
      complaint.deadline = deadlineOverride
        ? new Date(deadlineOverride)
        : computeDeadline(complaint.category, complaint.severity, now);
    } else if (status === 'In Progress') {
      complaint.timestamps.inProgress = now;
    } else if (status === 'Resolved') {
      complaint.timestamps.resolved = now;
      complaint.resolutionNote = resolutionNote || '';
    }

    // Recompute priority score in case severity changed
    complaint.priorityScore = computePriorityScore(
      complaint.severity,
      complaint.confirmations,
      complaint.upvotes
    );

    await complaint.save();
    res.json({ complaint });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// GET /api/complaints/:id — single complaint detail
export const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('reporter', 'name')
      .lean();

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json({ complaint });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
};
