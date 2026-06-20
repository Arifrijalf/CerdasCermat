import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Use a separate test database
const testDbDir = join(__dirname, '../../data-test');

if (existsSync(testDbDir)) {
  rmSync(testDbDir, { recursive: true, force: true });
}
mkdirSync(testDbDir, { recursive: true });

process.env.DB_DIR = testDbDir;
