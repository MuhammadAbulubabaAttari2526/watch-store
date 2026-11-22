import fs from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
const issues = [];

if (!supabaseUrl) {
  issues.push('Set NEXT_PUBLIC_SUPABASE_URL in storefront/.env.local.');
} else {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      issues.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS outside local development.');
    }
  } catch {
    issues.push('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.');
  }
}

if (!supabaseKey || /YOUR_|REPLACE/i.test(supabaseKey)) {
  issues.push('Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
}

if (issues.length) {
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else {
  console.log('Supabase public configuration is present.');
}
