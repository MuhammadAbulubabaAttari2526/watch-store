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

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
if (!apiUrl) {
  console.log('Store API is not configured. The storefront UI can run, but live store features need a replacement API.');
  process.exit(0);
}

try {
  const parsed = new URL(apiUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS URL.');
  console.log('Store API URL is configured.');
  console.log('Run the custom backend on the configured address to enable live store features.');
} catch (error) {
  console.error(`Invalid NEXT_PUBLIC_API_URL: ${error.message}`);
  process.exitCode = 1;
}
