import "dotenv/config";
import bcrypt from "bcryptjs";
import { store, newId, nowIso } from "./lib/store.js";

const email = process.argv[2] ?? process.env.SEED_EMAIL ?? "admin@example.com";
const password = process.argv[3] ?? process.env.SEED_PASSWORD ?? "Admin123!";
const name = process.argv[4] ?? "Admin";

const hash = await bcrypt.hash(password, 10);
const id = newId();
store.users.set(id, { id, email: email.toLowerCase(), passwordHash: hash, name, role: "admin", createdAt: nowIso() });
store.usersByEmail.set(email.toLowerCase(), id);
console.log(`Seeded admin ${email} / ${password} id=${id}`);
