/**
 * Generate the SQL to add a developer (with password hashed correctly).
 * Run from frontend folder: node scripts/create-developer.js <username> <password>
 *
 * Example: node scripts/create-developer.js Dev Minecraft98
 *
 * Then copy the printed SQL and run it in Supabase SQL Editor.
 */

const crypto = require('crypto');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Usage: node scripts/create-developer.js <username> <password>');
  console.error('Example: node scripts/create-developer.js Dev Minecraft98');
  process.exit(1);
}

const hash = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
const id = 'dev_' + Date.now();

const sql = `INSERT INTO public.developers (id, username, password_hash, display_name)
VALUES ('${id}', '${username.replace(/'/g, "''")}', '${hash}', 'Developer');`;

console.log('-- Paste this into Supabase SQL Editor:\n');
console.log(sql);
console.log('');
