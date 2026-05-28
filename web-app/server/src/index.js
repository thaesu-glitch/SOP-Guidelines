import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import projects from './routes/projects.js';
import vendors from './routes/vendors.js';
import boq from './routes/boq.js';
import quotations from './routes/quotations.js';
import approvals from './routes/approvals.js';
import dashboard from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/projects', projects);
app.use('/api/vendors', vendors);
app.use('/api/boq', boq);
app.use('/api/quotations', quotations);
app.use('/api/approvals', approvals);
app.use('/api/dashboard', dashboard);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
