const fs = require('fs');
let code = fs.readFileSync('src/pages/CallLogs.tsx', 'utf8');

code = code.replace(
  `className="px-4 py-2 bg-slate-50 border border-slate-200`,
  `className="w-full px-4 py-2 bg-slate-50 border border-slate-200`
);
fs.writeFileSync('src/pages/CallLogs.tsx', code);
console.log('Patched CallLogs Input');
