import 'dotenv/config';

import { createApp } from './app';
import { resolveDatabasePath } from './db/client';

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`TriAdapt API listening on http://localhost:${port}`);
  console.log(`SQLite ${resolveDatabasePath()}`);
});
