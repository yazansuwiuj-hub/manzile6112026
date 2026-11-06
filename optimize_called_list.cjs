const fs = require('fs');

const file = 'server/routes/calllogs.ts';
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf("router.get('/called-list'");
const end = s.indexOf("\n  });", start);

if (start === -1 || end === -1) {
  console.error('❌ لم أجد بلوك called-list');
  process.exit(1);
}

const oldBlock = s.slice(start, end + 6);

const newBlock = `router.get('/called-list', async (req, res) => {
  try {
    const dateStr = (req.query.date as string) || '';

    const query = \`
      SELECT DISTINCT dst
      FROM cdr
      WHERE calldate >= ?
        AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
        AND disposition = 'ANSWERED'
        AND dst REGEXP '^07[0-9]{8}$'
    \`;

    const [rows] = await require('../db/mysql').mysqlPool.query(
      query,
      [\`\${dateStr} 00:00:00\`, \`\${dateStr} 00:00:00\`]
    ) as any;

    res.json(rows.map((r: any) => r.dst));
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});`;

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(file, s);

console.log('✅ تم تحسين called-list بنجاح');
