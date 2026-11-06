const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  `<div className="flex-1 flex flex-col md:flex-row items-center gap-3">`,
  `<div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3">`
);
fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Patched Dashboard Layout');
