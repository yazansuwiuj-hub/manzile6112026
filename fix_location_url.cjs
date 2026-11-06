const fs = require('fs');

const file = 'server.ts';
let s = fs.readFileSync(file, 'utf8');

const old = `        // Otherwise try to follow redirects
        const fetchResponse = await fetch(url, {`;

const replacement = `        // Clean accidental characters before fetching the URL
        const cleanUrl = url
          .trim()
          .replace(/^[—–-]+\\s*/, '')
          .replace(/^["'<>]+|["'<>]+$/g, '');

        if (!/^https?:\\/\\//i.test(cleanUrl)) {
          return res.status(400).json({ error: 'Invalid URL' });
        }

        // Otherwise try to follow redirects
        const fetchResponse = await fetch(cleanUrl, {`;

if (!s.includes(old)) {
  console.error('❌ لم أجد مكان fetch الخاص بـ resolve-location');
  process.exit(1);
}

s = s.replace(old, replacement);

fs.writeFileSync(file, s);

console.log('✅ تم إصلاح معالجة روابط الخرائط');
