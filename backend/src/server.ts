import { env } from './config/env';
import { createApp } from './app';
import { db } from './core/db';
import { seed } from './seed';
import { purgeStaleUploads } from './modules/uploads/uploads.service';

db.load();
seed();
purgeStaleUploads();
setInterval(purgeStaleUploads, 3_600_000);

const server = createApp().listen(env.port, () => {
  console.log(`Whisper API listening on http://localhost:${env.port}`);
});

const shutdown = () => {
  db.flush();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
