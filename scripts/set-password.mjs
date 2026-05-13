#!/usr/bin/env node
// Sets the password for NEXT_PUBLIC_ALLOWED_EMAIL on the linked Supabase project.
// Reads SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_ALLOWED_EMAIL from .env.local.
// Usage: node scripts/set-password.mjs
//
// Prompts for a new password (hidden input), then calls the Supabase admin API.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.openStdin();
    process.stdout.write(question);
    const onData = (char) => {
      const s = char.toString();
      if (s === "\n" || s === "\r" || s === "\r\n" || s === "") {
        stdin.pause();
        stdin.removeListener("data", onData);
      } else {
        process.stdout.clearLine?.(0);
        process.stdout.cursorTo?.(0);
        process.stdout.write(question + "*".repeat(rl.line.length));
      }
    };
    stdin.on("data", onData);
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const env = loadEnv(new URL("../.env.local", import.meta.url).pathname);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const email = env.NEXT_PUBLIC_ALLOWED_EMAIL;

if (!url || !key || !email) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_ALLOWED_EMAIL in .env.local");
  process.exit(1);
}

const password = await promptHidden(`Nouveau mot de passe pour ${email}: `);
if (!password || password.length < 8) {
  console.error("Mot de passe trop court (min 8 caractères).");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const listRes = await fetch(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, { headers });
if (!listRes.ok) {
  console.error("Failed to list users:", listRes.status, await listRes.text());
  process.exit(1);
}
const listJson = await listRes.json();
const user = (listJson.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth user found for ${email}.`);
  process.exit(1);
}

const updateRes = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ password, email_confirm: true }),
});

if (!updateRes.ok) {
  console.error("Failed to update password:", updateRes.status, await updateRes.text());
  process.exit(1);
}

console.log(`OK — mot de passe défini pour ${email}.`);
