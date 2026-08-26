import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });
config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // migrations need session mode (prepared statements); transaction pooler breaks them
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
