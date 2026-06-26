const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- API Routes (must be before static files) ----

// Get all links
app.get('/api/links', (req, res) => {
  try {
    const links = db.getAllLinks();
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single link
app.get('/api/links/:id', (req, res) => {
  try {
    const link = db.getLinkById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create short link
app.post('/api/shorten', (req, res) => {
  try {
    const { id, original, short, domain, fullShort, createdAt } = req.body;
    if (!original || !short) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const link = db.createLink({ id, original, short, domain, fullShort, createdAt, copied: 0, opened: 0 });
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete link
app.delete('/api/links/:id', (req, res) => {
  try {
    const deleted = db.deleteLink(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Link not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all links
app.delete('/api/links', (req, res) => {
  try {
    db.clearAllLinks();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment copied count
app.patch('/api/links/:id/copied', (req, res) => {
  try {
    const link = db.incrementCopied(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment opened count
app.patch('/api/links/:id/opened', (req, res) => {
  try {
    const link = db.incrementOpened(req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Redirect Route ----
// Catch short code paths like /a8X92k and redirect
// Must be defined AFTER /api/* routes to avoid conflicts
app.get('/:shortCode', (req, res) => {
  try {
    const shortCode = req.params.shortCode;
    // Skip API-like paths
    if (shortCode === 'api' || shortCode.startsWith('api/')) {
      return res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
    const link = db.getLinkByShortCode(shortCode);
    if (!link) {
      return res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
    db.incrementOpened(link.id);
    res.redirect(301, link.original);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Serve static frontend files (after API routes)
app.use(express.static(path.join(__dirname, '..')));

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Shortly server running at http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
