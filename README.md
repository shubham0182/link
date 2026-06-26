# Shortly - Professional URL Shortener

A modern, responsive URL shortener web application with a **Node.js/Express backend** and **JSON file database** for persistent link storage and click tracking.

## Features

- **URL Shortening** - Convert long URLs into clean, short links
- **Real Redirects** - Short links actually redirect to the original URL
- **20+ Domain Extensions** - Choose from .com, .org, .io, .app, .dev, and more
- **Custom Aliases** - Create memorable short links like `https://shortly.com/github`
- **QR Code Generation** - Auto-generated QR codes for every link
- **History Management** - Full history with search, copy, open, delete
- **Statistics** - Track total links, today's links, copies, and opens (persisted in database)
- **Favorites** - Star your favorite links
- **Export/Import** - Export as CSV, JSON, or TXT; import data back
- **Dark/Light Theme** - Toggle between dark and light modes
- **Drag & Drop** - Drag and drop URLs to shorten
- **Keyboard Shortcuts** - `Ctrl+K` to focus URL input, `Escape` to close results
- **Particles Background** - Animated floating particles
- **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- HTML5 + CSS3 (Flexbox, Grid, Glassmorphism, Animations, Variables)
- Vanilla JavaScript (ES6+)
- QRCode.js Library
- **Node.js + Express** (backend)
- **JSON file database** (persistent storage)

## Getting Started

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Start the server

```bash
cd server
npm start
```

The server starts at `http://localhost:3000`.

### 3. Open the app

Visit `http://localhost:3000` in your browser and start shortening URLs!

## File Structure

```
project/
├── index.html              # Frontend HTML
├── css/
│   └── style.css           # All styles
├── js/
│   ├── script.js           # Frontend logic (API-backed)
│   └── qr.min.js           # QR code library
├── assets/
│   └── logo.svg            # Logo
├── server/
│   ├── package.json        # Node.js dependencies
│   ├── server.js           # Express server with API + redirect routes
│   ├── database.js         # JSON file database layer
│   └── shortly.json        # Data file (auto-created)
└── README.md
```

## API Endpoints

| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| GET    | `/api/links`                 | Get all links            |
| GET    | `/api/links/:id`             | Get single link          |
| POST   | `/api/shorten`               | Create short link        |
| DELETE | `/api/links/:id`             | Delete a link            |
| DELETE | `/api/links`                 | Clear all links          |
| PATCH  | `/api/links/:id/copied`      | Increment copy count     |
| PATCH  | `/api/links/:id/opened`      | Increment open count     |
| GET    | `/api/stats`                 | Get statistics           |
| GET    | `/:shortCode`                | Redirect to original URL |

## Count Tracking

Every time a short link is:
- **Copied** - the `copied` counter increments for that link
- **Opened/visited** - the `opened` counter increments and the browser redirects to the original URL

All counts are persisted in `server/shortly.json`. The stats dashboard shows totals across all links.

## License

MIT
# link
