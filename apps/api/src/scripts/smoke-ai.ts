/**
 * Optional local smoke test. Requires OPENAI_API_KEY in the environment.
 * CI must never run this — it would call live OpenAI.
 *
 *   OPENAI_API_KEY=sk-... npm run smoke:ai -w @racelens/api
 */
import 'dotenv/config';

async function main(): Promise<void> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error(
      'Local smoke test requires OPENAI_API_KEY in apps/api/.env. This command is not used in CI.',
    );
    process.exit(2);
  }

  const { createApp } = await import('../app');
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3001;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/sessions/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text',
        payload: '30 min easy run, RPE 3',
      }),
    });
    const body = await response.text();
    console.log(`analyze status ${response.status}`);
    console.log(body.slice(0, 400));
    if (!response.ok) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

void main();
