require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Fix for ENOTFOUND with Node fetch
const { generateKeyPair, getPublicKey, decryptVote, generateReceiptHash } = require('./crypto/keys');

const app = express();
const PORT = process.env.PORT || 3000;

// Load data
const voters = require('./data/voters.json');
const constituencies = require('./data/constituencies.json');
const candidates = require('./data/candidates.json');

// Vote storage (in-memory for demo)
const voteStore = new Map();
const votedVoters = new Set();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://*.google.com", "https://*.googleapis.com", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://translation.googleapis.com"],
      frameSrc: ["https://www.google.com", "https://maps.google.com"]
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'vote-saarthi-dev-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true in production with HTTPS
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict'
  }
}));

// Rate limiting
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many vote attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests.' }
});

app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ============ AUTH ROUTES ============

app.post('/api/auth/login', (req, res) => {
  const { voterId } = req.body;
  if (!voterId || !/^[A-Z]{3}[0-9]{7}$/.test(voterId)) {
    return res.status(400).json({ error: 'Invalid Voter ID format. Must be 3 uppercase letters followed by 7 digits (e.g., ABC1234567).' });
  }
  const voter = voters[voterId];
  if (!voter) {
    return res.status(404).json({ error: 'Voter ID not found. Please check your ID and try again.' });
  }
  req.session.voter = { voterId, ...voter };
  req.session.loginTime = Date.now();
  req.session.hasVoted = votedVoters.has(voterId);
  res.json({
    success: true,
    voter: { name: voter.name, constituency: voter.constituency, state: voter.state, district: voter.district },
    sessionExpiry: Date.now() + 30 * 60 * 1000
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.session.voter) {
    return res.status(401).json({ authenticated: false });
  }
  const elapsed = Date.now() - req.session.loginTime;
  const remaining = Math.max(0, 30 * 60 * 1000 - elapsed);
  if (remaining <= 0) {
    req.session.destroy(() => {});
    return res.status(401).json({ authenticated: false, reason: 'Session expired' });
  }
  res.json({
    authenticated: true,
    voter: req.session.voter,
    hasVoted: votedVoters.has(req.session.voter.voterId),
    sessionRemaining: remaining
  });
});

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.voter) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ============ TRANSLATION ROUTE ============

app.post('/api/translate', requireAuth, async (req, res) => {
  const { texts, targetLang } = req.body;
  if (!texts || !targetLang) return res.status(400).json({ error: 'Missing texts or targetLang' });
  
  try {
    const translations = await Promise.all(texts.map(async (text) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      // data[0] is an array of sentence translations
      const translatedText = data[0].map(item => item[0]).join('');
      return { translatedText, detectedSourceLanguage: 'en' };
    }));
    res.json({ translations });
  } catch (err) {
    console.error('Translation error:', err.message);
    res.json({ translations: texts.map(t => ({ translatedText: t })), fallback: true });
  }
});

// ============ DATA ROUTES ============

app.get('/api/booths/:constituencyId', requireAuth, (req, res) => {
  const constituency = constituencies[req.params.constituencyId];
  if (!constituency) return res.status(404).json({ error: 'Constituency not found' });
  res.json(constituency);
});

app.get('/api/candidates/:constituencyId', requireAuth, (req, res) => {
  const candidateList = candidates[req.params.constituencyId];
  if (!candidateList) return res.status(404).json({ error: 'Candidates not found for this constituency' });
  res.json(candidateList);
});

app.get('/api/maps-key', requireAuth, (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key === 'your_google_maps_api_key_here') {
    return res.json({ key: null, demo: true });
  }
  res.json({ key });
});

// ============ VOTING ROUTES ============

app.get('/api/vote/public-key', requireAuth, (req, res) => {
  try {
    res.json({ publicKey: getPublicKey() });
  } catch (err) {
    res.status(500).json({ error: 'Encryption keys not ready' });
  }
});

app.post('/api/vote/submit', requireAuth, voteLimiter, (req, res) => {
  const { encryptedVote, encryptedKey, iv } = req.body;
  const voterId = req.session.voter.voterId;

  if (votedVoters.has(voterId)) {
    return res.status(403).json({ error: 'You have already cast your vote.' });
  }
  if (!encryptedVote || !encryptedKey || !iv) {
    return res.status(400).json({ error: 'Invalid encrypted vote payload.' });
  }

  // Store encrypted vote
  const timestamp = new Date().toISOString();
  const receiptHash = generateReceiptHash(voterId, timestamp);

  voteStore.set(receiptHash, {
    encryptedVote,
    encryptedKey,
    iv,
    constituency: req.session.voter.constituency,
    timestamp
  });

  votedVoters.add(voterId);
  req.session.hasVoted = true;

  // Decrypt to verify (simulating Election Commission)
  const decryptedVote = decryptVote(encryptedKey, encryptedVote, iv);
  if (decryptedVote) {
    console.log(`✅ Vote recorded [${receiptHash}] — Constituency: ${req.session.voter.constituency} — Decryption verified by EC`);
  } else {
    console.log(`⚠️ Vote recorded [${receiptHash}] — Decryption pending`);
  }

  res.json({
    success: true,
    receipt: receiptHash,
    message: 'Your vote has been securely recorded with end-to-end encryption.',
    timestamp
  });
});

// ============ SPA FALLBACK ============

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/guide', (req, res) => res.sendFile(path.join(__dirname, 'public', 'guide.html')));
app.get('/booth-finder', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booth-finder.html')));
app.get('/vote', (req, res) => res.sendFile(path.join(__dirname, 'public', 'vote.html')));

// ============ START SERVER ============

async function start() {
  await generateKeyPair();
  app.listen(PORT, () => {
    console.log(`\n🗳️  Vote Saarthi is running at http://localhost:${PORT}`);
    console.log(`📋 Demo Voter IDs: ABC1234567, DEF2345678, GHI3456789`);
    console.log(`🔐 E2E Encryption: Active\n`);
  });
}

start().catch(console.error);
