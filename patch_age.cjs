const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetStr = `                  {/* Patient Name Section */}
                  <div className="mb-5">
                    <h3 className="font-bold text-[1.35rem] text-slate-900 group-hover:text-green-700 transition-colors leading-tight">
                      {app.name}
                    </h3>
                  </div>`;

const replaceStr = `                  {/* Patient Name Section */}
                  <div className="mb-5">
                    <h3 className="font-bold text-[1.35rem] text-slate-900 group-hover:text-green-700 transition-colors leading-tight flex flex-wrap items-baseline gap-2">
                      <span>{app.name}</span>
                      {app.age ? <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">({app.age} سنة)</span> : null}
                    </h3>
                  </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log('Patched app.name to include app.age');
} else {
  console.log('Target string not found');
}
