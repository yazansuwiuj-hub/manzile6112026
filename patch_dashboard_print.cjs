const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  `<div className="flex items-center gap-3">`,
  `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">`
);
code = code.replace(
  `className="border border-slate-200 rounded-[16px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-600 font-bold text-sm text-slate-700 bg-white shadow-xs cursor-pointer min-w-[200px]"`,
  `className="w-full sm:w-auto border border-slate-200 rounded-[16px] px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-600 font-bold text-sm text-slate-700 bg-white shadow-xs cursor-pointer min-w-[200px]"`
);
code = code.replace(
  `className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white gap-2 font-bold py-3.5 px-6 h-auto shadow-xs rounded-[16px] border-0 cursor-pointer transition-all"`,
  `className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white gap-2 font-bold py-3.5 px-6 h-auto shadow-xs rounded-[16px] border-0 cursor-pointer transition-all"`
);
fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Patched Dashboard Print Layout');
