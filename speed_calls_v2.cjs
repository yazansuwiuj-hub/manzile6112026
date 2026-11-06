const fs = require('fs');

const file = 'src/pages/CallLogs.tsx';
const backup = 'src/pages/CallLogs.tsx.bak_before_speed_v2';

let s = fs.readFileSync(file, 'utf8');

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

/* 1) Replace duplicate filtering for missed calls */
const p1 = /\/\/ AvoidDuplicates\s*for \(let i = 0; i < newGrid1\.length; i\+\+\) \{[\s\S]*?\n\s*\}\n\s*\n\s*\/\/ AvoidDuplicates2/;

const r1 = `// AvoidDuplicates - O(n)
              const seenMissed = new Set<string>();
              for (const row of newGrid1) {
                  if (seenMissed.has(row.src)) {
                      row._visible = false;
                  } else {
                      seenMissed.add(row.src);
                  }
              }

              // AvoidDuplicates2`;

if (!p1.test(s)) {
  console.error('❌ لم أجد AvoidDuplicates');
  process.exit(1);
}

s = s.replace(p1, r1);


/* 2) Replace duplicate filtering for answered calls */
const p2 = /\/\/ AvoidDuplicates2\s*for \(let i = 0; i < newGrid2\.length; i\+\+\) \{[\s\S]*?\n\s*\}\n\s*\n\s*\/\/ AvoidDuplicatesanswer/;

const r2 = `// AvoidDuplicates2 - O(n)
              const seenAnswered = new Set<string>();
              for (const row of newGrid2) {
                  if (seenAnswered.has(row.src)) {
                      row._visible = false;
                  } else {
                      seenAnswered.add(row.src);
                  }
              }

              // AvoidDuplicatesanswer`;

if (!p2.test(s)) {
  console.error('❌ لم أجد AvoidDuplicates2');
  process.exit(1);
}

s = s.replace(p2, r2);


/* 3) Replace missed-vs-answered nested loop */
const p3 = /\/\/ AvoidDuplicatesanswer\s*for \(let i = 0; i < newGrid1\.length; i\+\+\) \{[\s\S]*?\n\s*\}\n\s*\n\s*\/\/ AvoidDuplicatesanswery/;

const r3 = `// AvoidDuplicatesanswer - O(n)
              const answeredNumbers = new Set(
                  newGrid2.map((row: any) => row.src).filter(Boolean)
              );

              for (const row of newGrid1) {
                  if (answeredNumbers.has(row.src)) {
                      row._visible = false;
                  }
              }

              // AvoidDuplicatesanswery`;

if (!p3.test(s)) {
  console.error('❌ لم أجد AvoidDuplicatesanswer');
  process.exit(1);
}

s = s.replace(p3, r3);


/* 4) Replace missed-vs-outbound nested loop */
const p4 = /\/\/ AvoidDuplicatesanswery\s*for \(let i = 0; i < newGrid1\.length; i\+\+\) \{[\s\S]*?\n\s*\}\n\s*\n\s*\/\/ extooo/;

const r4 = `// AvoidDuplicatesanswery - O(n)
              const outboundNumbers = new Set<string>();

              for (const row of newGrid5) {
                  if (row.src) outboundNumbers.add(row.src);
                  if (row.dst) outboundNumbers.add(row.dst);
              }

              for (const row of newGrid1) {
                  if (outboundNumbers.has(row.src)) {
                      row._visible = false;
                  }
              }

              // extooo`;

if (!p4.test(s)) {
  console.error('❌ لم أجد AvoidDuplicatesanswery');
  process.exit(1);
}

s = s.replace(p4, r4);


/* 5) Optimize called-list processing */
const p5 = /let sb = "";\s*for \(let i = 0; i < newGrid1\.length; i\+\+\) \{[\s\S]*?\n\s*\}\n\s*setNonoText\(sb\);/;

const r5 = `let sb = "";

              for (const row of newGrid1) {
                  const currvalue = row.src;

                  if (!currvalue || !row._visible || currvalue === "anonymous") {
                      continue;
                  }

                  if (calledSet.has(currvalue)) {
                      row._visible = false;
                      row._star = true;
                  } else {
                      sb += currvalue + "\\n";
                  }
              }

              setNonoText(sb);`;

if (!p5.test(s)) {
  console.error('❌ لم أجد معالجة called-list');
  process.exit(1);
}

s = s.replace(p5, r5);

fs.writeFileSync(file, s);

console.log('✅ تم تحسين معالجة المكالمات بنجاح');
console.log('✅ تم إنشاء backup: ' + backup);
