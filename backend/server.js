const express = require('express');





const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const os = require('os');
const helmet = require('helmet');

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

const netInfo = getNetworkInfo();
const LOCAL_IPS = netInfo.map(info => info.address);

// Prioritize Windows Mobile Hotspot / Local private networks for testing
let primaryNet = netInfo.find(ip => ip.address.startsWith('192.168.'));
if (!primaryNet) primaryNet = netInfo.find(ip => ip.address.startsWith('10.'));
if (!primaryNet) primaryNet = netInfo.find(ip => !ip.address.startsWith('172.'));
if (!primaryNet) primaryNet = netInfo[0];

const PRIMARY_IP = primaryNet ? primaryNet.address : 'localhost';

dotenv.config();

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'trustora-app.appspot.com'
  });
  console.log('✅ Firebase Admin initialized with service account.');
} else {
  console.log('⚠️  Firebase Admin: serviceAccountKey.json NOT found. Running in mock/limited mode.');
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false, // allow local uploads to show
}));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve local uploads statically
app.use('/uploads', express.static(uploadsDir));

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...LOCAL_IPS.map(ip => `http://${ip}:5173`),
  ...LOCAL_IPS.map(ip => `http://${ip}:5174`)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const documentsRouter = require('./routes/documents');
const qrRouter = require('./routes/qr');
const requestsRouter = require('./routes/requests');
const trustRouter = require('./routes/trust');
const publicRouter = require('./routes/public');
const chatRouter = require('./routes/chat');

app.use('/api/documents', documentsRouter);
app.use('/api/qr', qrRouter);
app.use('/api/requests', require('./routes/requests'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/trust', trustRouter);
app.use('/api/public', publicRouter);
app.use('/api/blockchain', require('./routes/blockchain'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trustora backend is running 🛡️' });
});

// Debug Cache (Temporary)
app.get('/api/health/cache', (req, res) => {
  res.json(global.mockRequestsCache || {});
});

// Root route for visibility
app.get('/', (req, res) => {
  res.send('<h1>🛡️ Trustora Backend is Live</h1><p>The API is running on this port (5000). <br> To use the app, go to: <a href="http://localhost:5173">http://localhost:5173</a></p>');
});

app.listen(PORT, () => {
  console.log(`\n🛡️  Trustora Backend running at http://localhost:${PORT}`);
  console.log(`📲  Mobile Reachable (Primary IP): http://${PRIMARY_IP}:${PORT}`);
  if (LOCAL_IPS.length > 1) {
    console.log(`📡  Other IPs detected: ${LOCAL_IPS.slice(1).join(', ')}`);
  }
  console.log(`🌐  CORS enabled for ${allowedOrigins.length} origins\n`);
});
