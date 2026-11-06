const fs = require('fs');

const file = 'src/pages/CallLogs.tsx';
let s = fs.readFileSync(file, 'utf8');

const old = `const [g1Res, g2Res, g5Res] = await Promise.all([
                fetch(\`/api/calls/missed?date=\${date}\`),
                fetch(\`/api/calls/answered?date=\${date}\`),
                fetch(\`/api/calls/outbound?date=\${date}\`)
            ]);`;

const replacement = `const [g1Res, g2Res, g5Res, calledRes] = await Promise.all([
                fetch(\`/api/calls/missed?date=\${date}\`),
                fetch(\`/api/calls/answered?date=\${date}\`),
                fetch(\`/api/calls/outbound?date=\${date}\`),
                fetch(\`/api/calls/called-list?date=\${date}\`)
            ]);`;

if (!s.includes(old)) {
  console.error('❌ لم أجد Promise.all الخاص بالمكالمات');
  process.exit(1);
}

s = s.replace(old, replacement);

const oldJson = `const [g1, g2, g5] = await Promise.all([
                g1Res.json(),
                g2Res.json(),
                g5Res.json()
            ]);`;

const replacementJson = `const [g1, g2, g5, calledList] = await Promise.all([
                g1Res.json(),
                g2Res.json(),
                g5Res.json(),
                calledRes.json()
            ]);`;

if (!s.includes(oldJson)) {
  console.error('❌ لم أجد Promise.all الخاص بـ JSON');
  process.exit(1);
}

s = s.replace(oldJson, replacementJson);

const oldCalled = `// ifcalling
              const calledRes = await fetch(\`/api/calls/called-list?date=\${date}\`);
              const calledList = await calledRes.json();
              const calledSet = new Set(calledList);`;

const replacementCalled = `// ifcalling
              const calledSet = new Set(calledList);`;

if (!s.includes(oldCalled)) {
  console.error('❌ لم أجد called-list القديم');
  process.exit(1);
}

s = s.replace(oldCalled, replacementCalled);

fs.writeFileSync(file, s);

console.log('✅ تم تشغيل called-list بالتوازي مع المكالمات');
