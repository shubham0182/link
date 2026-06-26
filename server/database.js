const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'shortly.json');

function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getAllLinks() {
  return readDb().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getLinkById(id) {
  return readDb().find(l => l.id === id) || null;
}

function getLinkByShortCode(shortCode) {
  return readDb().find(l => l.short === shortCode) || null;
}

function createLink(link) {
  const db = readDb();
  db.push({
    id: link.id,
    original: link.original,
    short: link.short,
    domain: link.domain,
    fullShort: link.fullShort,
    createdAt: link.createdAt,
    copied: link.copied || 0,
    opened: link.opened || 0
  });
  writeDb(db);
  return getLinkById(link.id);
}

function deleteLink(id) {
  const db = readDb();
  const idx = db.findIndex(l => l.id === id);
  if (idx === -1) return false;
  db.splice(idx, 1);
  writeDb(db);
  return true;
}

function clearAllLinks() {
  writeDb([]);
}

function incrementCopied(id) {
  const db = readDb();
  const link = db.find(l => l.id === id);
  if (!link) return null;
  link.copied++;
  writeDb(db);
  return link;
}

function incrementOpened(id) {
  const db = readDb();
  const link = db.find(l => l.id === id);
  if (!link) return null;
  link.opened++;
  writeDb(db);
  return link;
}

function getStats() {
  const db = readDb();
  const todayKey = new Date().toDateString();
  const todayLinks = db.filter(l => {
    const d = new Date(l.createdAt);
    return d.toDateString() === todayKey;
  });
  const totalCopied = db.reduce((sum, l) => sum + (l.copied || 0), 0);
  const totalOpened = db.reduce((sum, l) => sum + (l.opened || 0), 0);
  return {
    total: db.length,
    today: todayLinks.length,
    copied: totalCopied,
    opened: totalOpened
  };
}

module.exports = {
  getAllLinks,
  getLinkById,
  getLinkByShortCode,
  createLink,
  deleteLink,
  clearAllLinks,
  incrementCopied,
  incrementOpened,
  getStats
};
