const fs = require('fs');
let code = fs.readFileSync('src/pages/MissedCalls.tsx', 'utf8');

const target = `<div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-inner">`;
const replace = `<div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 shadow-inner">`;

code = code.replace(target, replace);
fs.writeFileSync('src/pages/MissedCalls.tsx', code);
console.log('Patched MissedCalls layout');
