import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { CATEGORY_TO_DEPARTMENT, CATEGORIES } from '../services/routing.js';
import { computePriorityScore } from '../services/priority.js';
import { computeDeadline } from '../services/sla.js';

const SALT_ROUNDS = 10;

const CITY_CENTER_LAT = parseFloat(process.env.CITY_CENTER_LAT) || 17.3850;
const CITY_CENTER_LNG = parseFloat(process.env.CITY_CENTER_LNG) || 78.4867;

// Seed accounts per §15
const SEED_ACCOUNTS = [
  { name: 'PWD Department', email: 'pwd@civicpulse.demo', password: 'Password123!', role: 'department', department: 'PWD' },
  { name: 'Sanitation Department', email: 'sanitation@civicpulse.demo', password: 'Password123!', role: 'department', department: 'SANITATION' },
  { name: 'Water Board', email: 'water@civicpulse.demo', password: 'Password123!', role: 'department', department: 'WATER_BOARD' },
  { name: 'Electricity Department', email: 'electricity@civicpulse.demo', password: 'Password123!', role: 'department', department: 'ELECTRICITY' },
  { name: 'Traffic Police', email: 'traffic@civicpulse.demo', password: 'Password123!', role: 'department', department: 'TRAFFIC_POLICE' },
  { name: 'Admin', email: 'admin@civicpulse.demo', password: 'Password123!', role: 'admin' },
];

// Sample photo URLs (placeholder Cloudinary-style URLs for seeded data)
const SAMPLE_PHOTOS = [
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/architecture-signs.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/food/spices.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/beach-boat.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/samples/animals/three-dogs.jpg',
];

// Generate random point within radius (km) of center
const randomPoint = (centerLat, centerLng, radiusKm) => {
  const radiusInDegrees = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  // Adjust for longitude distortion at this latitude
  const newLng = centerLng + x / Math.cos(centerLat * Math.PI / 180);
  const newLat = centerLat + y;
  return [newLng, newLat]; // GeoJSON order [lng, lat]
};

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a random date within the past N days
const randomPastDate = (maxDaysAgo) => {
  const daysAgo = Math.random() * maxDaysAgo;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// Generate random hex hash (for seeded pHash values)
const randomHash = () => {
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civicpulse');
    console.log('Connected to MongoDB');

    const shouldReset = process.argv.includes('--reset');

    if (shouldReset) {
      await Complaint.deleteMany({});
      console.log('Cleared complaints dataset (--reset flag provided)');
    }

    // Create or update default department/admin seed accounts without deleting existing user signups
    for (const account of SEED_ACCOUNTS) {
      const existing = await User.findOne({ email: account.email });
      if (!existing) {
        const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);
        await User.create({
          name: account.name,
          email: account.email,
          passwordHash,
          role: account.role,
          department: account.department
        });
        console.log(`  Created ${account.role} account: ${account.email}`);
      } else {
        console.log(`  Preserved existing account: ${account.email}`);
      }
    }

    // Ensure demo citizen accounts exist if not already created
    const citizenPassHash = await bcrypt.hash('Password123!', SALT_ROUNDS);
    let citizen1 = await User.findOne({ email: 'citizen1@civicpulse.demo' });
    if (!citizen1) {
      citizen1 = await User.create({
        name: 'Rahul Kumar',
        email: 'citizen1@civicpulse.demo',
        passwordHash: citizenPassHash,
        role: 'citizen'
      });
    }
    let citizen2 = await User.findOne({ email: 'citizen2@civicpulse.demo' });
    if (!citizen2) {
      citizen2 = await User.create({
        name: 'Priya Sharma',
        email: 'citizen2@civicpulse.demo',
        passwordHash: citizenPassHash,
        role: 'citizen'
      });
    }

    const citizenIds = [citizen1._id, citizen2._id];
    const STATUSES = ['New', 'Acknowledged', 'In Progress', 'Resolved'];
    const SEVERITIES = ['low', 'medium', 'high'];

    if (shouldReset) {
      // Generate ~40 complaints for testing/demo reset
      const complaints = [];
      for (let i = 0; i < 40; i++) {
        const category = randomElement(CATEGORIES);
        const severity = randomElement(SEVERITIES);
        const department = CATEGORY_TO_DEPARTMENT[category];
        const status = randomElement(STATUSES);
        const reportedDate = randomPastDate(21); // within last 3 weeks
        const coords = randomPoint(CITY_CENTER_LAT, CITY_CENTER_LNG, 5);
        const confirmations = randomInt(0, 5);
        const upvotes = randomInt(0, 10);
        const priorityScore = computePriorityScore(severity, confirmations, upvotes);

        const complaintData = {
          reporter: randomElement(citizenIds),
          photoUrl: randomElement(SAMPLE_PHOTOS),
          photoPublicId: `seed_${i}`,
          pHash: randomHash(),
          location: { type: 'Point', coordinates: coords },
          category,
          severity,
          aiConfidence: Math.round(Math.random() * 40 + 60) / 100, // 0.60–1.00
          description: getDescription(category),
          department,
          status,
          timestamps: { reported: reportedDate },
          confirmations,
          upvotes,
          priorityScore,
          createdAt: reportedDate,
          updatedAt: reportedDate
        };

        // Set status-specific timestamps and deadlines
        if (status !== 'New') {
          const ackDate = new Date(reportedDate);
          ackDate.setHours(ackDate.getHours() + randomInt(1, 48));
          complaintData.timestamps.acknowledged = ackDate;
          complaintData.deadline = computeDeadline(category, severity, ackDate);

          // Make some intentionally overdue
          if (i % 7 === 0 && status !== 'Resolved') {
            const oldAckDate = new Date();
            oldAckDate.setDate(oldAckDate.getDate() - 20);
            complaintData.timestamps.acknowledged = oldAckDate;
            complaintData.deadline = computeDeadline(category, severity, oldAckDate);
          }

          if (status === 'In Progress' || status === 'Resolved') {
            const ipDate = new Date(complaintData.timestamps.acknowledged);
            ipDate.setHours(ipDate.getHours() + randomInt(2, 72));
            complaintData.timestamps.inProgress = ipDate;
          }

          if (status === 'Resolved') {
            const resDate = new Date(complaintData.timestamps.inProgress);
            resDate.setHours(resDate.getHours() + randomInt(4, 96));
            complaintData.timestamps.resolved = resDate;
            complaintData.resolutionNote = 'Issue has been addressed and resolved by the field team.';
          }
        }

        // Generate confirmedBy array
        if (confirmations > 0) {
          complaintData.confirmedBy = citizenIds.slice(0, Math.min(confirmations, citizenIds.length));
        }

        // Generate upvotedBy array
        if (upvotes > 0) {
          complaintData.upvotedBy = citizenIds.slice(0, Math.min(upvotes, citizenIds.length));
        }

        complaints.push(complaintData);
      }

      await Complaint.insertMany(complaints);
      console.log(`\nCreated ${complaints.length} seeded complaints`);
    } else {
      console.log('\nSkipped synthetic complaint generation (pass --reset if you want to regenerate mock complaints)');
    }

    const allComplaints = await Complaint.find();
    console.log(`\nTotal complaints in database: ${allComplaints.length}`);

    console.log('\n✓ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

function getDescription(category) {
  const descriptions = {
    pothole: 'Large pothole causing danger to vehicles and pedestrians. Needs immediate repair.',
    broken_footpath: 'Broken footpath tiles making it unsafe for pedestrians.',
    damaged_road_divider: 'Road divider is damaged and partially collapsed.',
    collapsed_culvert: 'Culvert has collapsed causing road surface damage.',
    garbage_overflow: 'Garbage bin overflowing, waste spilling onto the street.',
    illegal_dumping: 'Construction debris dumped illegally on the roadside.',
    uncollected_trash: 'Trash has not been collected for several days.',
    blocked_drain: 'Storm drain is completely blocked causing water logging.',
    pipe_leak: 'Water pipe leaking causing water wastage and road damage.',
    contaminated_water: 'Water supply appears contaminated with unusual color and smell.',
    sewage_overflow: 'Sewage overflowing onto the street, creating health hazard.',
    manhole_issue: 'Manhole cover is missing, posing serious safety risk.',
    streetlight_outage: 'Multiple streetlights not functioning, area is very dark at night.',
    exposed_wiring: 'Electrical wires exposed near the footpath. Extremely dangerous.',
    damaged_transformer: 'Transformer sparking and making unusual sounds.',
    broken_traffic_signal: 'Traffic signal not working, causing traffic chaos at junction.',
    faded_road_marking: 'Lane markings and zebra crossing completely faded.',
    illegal_parking: 'Vehicles parked illegally blocking the main road.'
  };
  return descriptions[category] || 'Civic infrastructure issue requiring attention.';
}

seed();
