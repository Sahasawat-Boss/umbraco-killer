// One-shot local setup after `git clone` + `npm install`:
//   1. create .env from .env.example (with a random AUTH_SECRET) if it doesn't exist
//   2. start Postgres in Docker
//   3. wait until Postgres accepts connections
//   4. create the tables (prisma db push)
// Safe to run again: it never overwrites an existing .env and db push is idempotent.
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const ok = (cmd) => {
  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const [major] = process.versions.node.split(".").map(Number);
if (major < 20) fail(`Node.js 20+ is required (you have ${process.versions.node}).`);

// 1. .env
if (existsSync(".env")) {
  console.log("✔ .env already exists — leaving it as is");
} else {
  const secret = randomBytes(32).toString("base64url");
  const env = readFileSync(".env.example", "utf8").replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`);
  writeFileSync(".env", env);
  console.log("✔ Created .env with a random AUTH_SECRET");
}

// Using your own Postgres? Set DATABASE_URL in .env and run with --no-docker.
const useDocker = !process.argv.includes("--no-docker");

if (useDocker) {
  // 2. Postgres
  if (!ok("docker info")) {
    fail("Docker is not running. Start Docker Desktop and try again,\n  or point DATABASE_URL in .env at your own Postgres and run: npm run setup -- --no-docker");
  }
  run("docker compose up -d");

  // 3. Wait for it
  process.stdout.write("… waiting for Postgres");
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    ready = ok("docker exec umb-killer-db pg_isready -U umbkiller -d umbkiller");
    if (!ready) {
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.log();
  if (!ready) fail("Postgres did not become ready within 30 s. Check `docker compose logs db`.");
  console.log("✔ Postgres is ready");
}

// 4. Tables
run("npx prisma db push --skip-generate");

console.log(`
✔ Setup complete.

  npm run dev     → http://localhost:3000  (first visit opens /install)
`);
