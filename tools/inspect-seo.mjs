import fs from 'node:fs';

for (const f of fs.readdirSync('.').filter((x) => x.endsWith('.html'))) {
  const s = fs.readFileSync(f, 'utf8');
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || '—';
  const hasDesc = s.includes('name="description"');
  const lang = s.includes('<html lang="ru"');
  const h1 = (s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const cleanH1 = h1 ? h1.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  console.log(`${f.padEnd(20)} ${hasDesc ? 'desc' : '    '} ${lang ? 'lang' : '    '} | ${title} | ${cleanH1}`);
}
