import mongoose from 'mongoose';

const CATEGORIES = [
  'pothole', 'broken_footpath', 'damaged_road_divider', 'collapsed_culvert',
  'garbage_overflow', 'illegal_dumping', 'uncollected_trash', 'blocked_drain',
  'pipe_leak', 'contaminated_water', 'sewage_overflow', 'manhole_issue',
  'streetlight_outage', 'exposed_wiring', 'damaged_transformer',
  'broken_traffic_signal', 'faded_road_marking', 'illegal_parking'
];

const DEPARTMENTS = ['PWD', 'SANITATION', 'WATER_BOARD', 'ELECTRICITY', 'TRAFFIC_POLICE'];

const complaintSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  photoUrl: { type: String, required: true },
  photoPublicId: String,
  pHash: String,

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat] — GeoJSON order
  },

  category: { type: String, enum: CATEGORIES, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  aiConfidence: { type: Number, min: 0, max: 1 },
  categoryOverridden: { type: Boolean, default: false },
  severityOverridden: { type: Boolean, default: false },

  description: String,
  department: { type: String, enum: DEPARTMENTS, required: true },

  status: { type: String, enum: ['New', 'Acknowledged', 'In Progress', 'Resolved'], default: 'New' },
  timestamps: {
    reported: { type: Date, default: Date.now },
    acknowledged: Date,
    inProgress: Date,
    resolved: Date
  },
  deadline: Date,
  resolutionNote: String,

  confirmations: { type: Number, default: 0 },
  confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  priorityScore: { type: Number, default: 0 }
}, { timestamps: true });

// GeoJSON index for proximity queries
complaintSchema.index({ location: '2dsphere' });

// Department queue query index
complaintSchema.index({ department: 1, status: 1, priorityScore: -1 });

// Auto-generate a readable ticket ID
complaintSchema.virtual('ticketId').get(function () {
  if (!this._id) return '';
  // Use last 6 chars of ObjectId hex for a short numeric-looking ID
  const hex = this._id.toHexString();
  const num = parseInt(hex.slice(-6), 16) % 1000000;
  return `CP-${String(num).padStart(6, '0')}`;
});

complaintSchema.set('toJSON', { virtuals: true });
complaintSchema.set('toObject', { virtuals: true });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
export { CATEGORIES, DEPARTMENTS };
