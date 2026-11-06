const fs = require('fs');

const file = 'server/services/calllogs.service.ts';
let s = fs.readFileSync(file, 'utf8');

s = s.replace(
`WHERE disposition = 'NO ANSWER'
              AND calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND lastapp = 'Queue'`,
`WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'NO ANSWER'
              AND lastapp = 'Queue'`
);

s = s.replace(
`WHERE disposition = 'ANSWERED'
              AND calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND lastapp = 'Queue'`,
`WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'ANSWERED'
              AND lastapp = 'Queue'`
);

s = s.replace(
`WHERE disposition = 'ANSWERED'
              AND calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND outbound_cnum = '0797003356'`,
`WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'ANSWERED'
              AND outbound_cnum = '0797003356'`
);

fs.writeFileSync(file, s);

console.log('✅ تم تحديث calllogs.service.ts');
