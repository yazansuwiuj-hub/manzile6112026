const fs = require('fs');

const file = 'src/pages/CallLogs.tsx';
let s = fs.readFileSync(file, 'utf8');

const oldFetch = `const [g1Res, g2Res, g5Res] = await Promise.all([
                fetch(\`/api/calls/missed?date=\${date}\`),
                fetch(\`/api/calls/answered?date=\${date}\`),
                fetch(\`/api/calls/outbound?date=\${date}\`)
            ]);`;

const newFetch = `const [g1Res, g2Res, g5Res, calledRes] = await Promise.all([
                fetch(\`/api/calls/missed?date=\${date}\`),
                fetch(\`/api/calls/answered?date=\${date}\`),
                fetch(\`/api/calls/outbound?date=\${date}\`),
                fetch(\`/api/calls/called-list?date=\${date}\`)
            ]);`;

if (!s.includes(oldFetch)) {
    console.error('❌ لم أجد Promise.all الأول');
    process.exit(1);
}

s = s.replace(oldFetch, newFetch);

const oldJson = `const [g1, g2, g5] = await Promise.all([
                g1Res.json(),
                g2Res.json(),
                g5Res.json()
            ]);`;

const newJson = `const [g1, g2, g5, calledList] = await Promise.all([
                g1Res.json(),
                g2Res.json(),
                g5Res.json(),
                calledRes.json()
            ]);`;

if (!s.includes(oldJson)) {
    console.error('❌ لم أجد Promise.all الخاص بـ JSON');
    process.exit(1);
}

s = s.replace(oldJson, newJson);

fs.writeFileSync(file, s);

console.log('✅ تم إصلاح CallLogs.tsx');
