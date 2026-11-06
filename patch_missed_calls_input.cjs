const fs = require('fs');
let code = fs.readFileSync('src/pages/MissedCalls.tsx', 'utf8');

code = code.replace(
  `className="h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none font-semibold bg-white hover:bg-slate-50 transition-colors"`,
  `className="w-full md:w-auto h-11 border border-slate-200 rounded-xl px-4 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500 outline-none font-semibold bg-white hover:bg-slate-50 transition-colors"`
);
code = code.replace(
  `<button className="h-11 bg-green-600`,
  `<button className="w-full md:w-auto h-11 bg-green-600`
);
fs.writeFileSync('src/pages/MissedCalls.tsx', code);
console.log('Patched MissedCalls Input');
