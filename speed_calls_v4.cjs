const fs = require('fs');

const file = 'src/pages/CallLogs.tsx';
let s = fs.readFileSync(file, 'utf8');

const pattern = /\/\/ ifcalling[\s\S]*?const calledSet = new Set\(calledList\);/;

const replacement = `// ifcalling
              const calledSet = new Set(calledList);`;

if (!pattern.test(s)) {
  console.error('❌ لم أجد بلوك called-list القديم');
  process.exit(1);
}

s = s.replace(pattern, replacement);

fs.writeFileSync(file, s);
console.log('✅ تم حذف طلب called-list المتكرر');
