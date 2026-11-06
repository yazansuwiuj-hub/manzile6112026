import { mysqlPool } from "../db/mysql";

export class CallsService {
  async getDashboard(date: string) {
    const totalStart = performance.now();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Invalid date format. Expected YYYY-MM-DD");
    }

    const startDate = `${date} 00:00:00`;
    const endDate = `${date} 00:00:00`;

    const missedStart = performance.now();

    const [missed] = await mysqlPool.query(
      `SELECT
          q.linkedid,
          MAX(q.uniqueid) AS uniqueid,
          q.src,
          MAX(q.dst) AS dst,
          MIN(q.calldate) AS calldate,
          'NO ANSWER' AS disposition
       FROM cdr q
       WHERE q.calldate >= ?
         AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND q.lastapp = 'Queue'
         AND q.dcontext = 'ext-queues'
         AND q.src REGEXP '^07[0-9]{8}$'
         AND NOT EXISTS (
             SELECT 1
             FROM cdr c
             WHERE c.linkedid = q.linkedid
               AND c.disposition = 'ANSWERED'
         )
       AND NOT EXISTS (
    SELECT 1
    FROM cdr o
    WHERE o.linkedid <> q.linkedid
      AND o.dst = q.src
      AND o.outbound_cnum = '0797003356'
      AND o.dcontext = 'from-internal'
      AND o.disposition = 'ANSWERED'
      AND o.dst REGEXP '^07[0-9]{8}$'
      AND o.calldate > (
          SELECT MIN(q2.calldate)
          FROM cdr q2
          WHERE q2.linkedid = q.linkedid
            AND q2.lastapp = 'Queue'
            AND q2.dcontext = 'ext-queues'
      )
)
            GROUP BY q.linkedid, q.src
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );

    console.log(`[Dashboard] missed: ${(performance.now() - missedStart).toFixed(2)} ms`);

    const answeredStart = performance.now();

    const [answered] = await mysqlPool.query(
      `SELECT
          q.linkedid,
          MAX(q.uniqueid) AS uniqueid,
          q.src,
          MAX(q.dst) AS dst,
          MIN(q.calldate) AS calldate,
          MAX(q.duration) AS duration,
          MAX(c.billsec) AS billsec,
          'ANSWERED' AS disposition,
          MAX(
              CASE
                  WHEN c.lastapp = 'Dial'
                   AND c.disposition = 'ANSWERED'
                  THEN c.dst
              END
          ) AS answered_extension,
          MAX(
              CASE
                  WHEN c.lastapp = 'Dial'
                   AND c.disposition = 'ANSWERED'
                  THEN c.dstchannel
              END
          ) AS dstchannel
       FROM cdr q
       LEFT JOIN cdr c
         ON c.linkedid = q.linkedid
        AND c.disposition = 'ANSWERED'
       WHERE q.calldate >= ?
         AND q.calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND q.lastapp = 'Queue'
         AND q.dcontext = 'ext-queues'
         AND q.src REGEXP '^07[0-9]{8}$'
         AND EXISTS (
             SELECT 1
             FROM cdr a
             WHERE a.linkedid = q.linkedid
               AND a.disposition = 'ANSWERED'
         )
       GROUP BY q.linkedid, q.src
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );

    console.log(`[Dashboard] answered: ${(performance.now() - answeredStart).toFixed(2)} ms`);

    const outboundStart = performance.now();

    const [outbound] = await mysqlPool.query(
      `SELECT
          linkedid,
          MAX(uniqueid) AS uniqueid,
          MAX(dst) AS dst,
          MAX(cnam) AS cnam,
          MIN(calldate) AS calldate,
          'ANSWERED' AS disposition
       FROM cdr
       WHERE calldate >= ?
         AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
         AND dcontext = 'from-internal'
         AND outbound_cnum = '0797003356'
         AND disposition = 'ANSWERED'
         AND dst REGEXP '^07[0-9]{8}$'
       GROUP BY linkedid
       ORDER BY calldate DESC`,
      [startDate, endDate]
    );

    console.log(`[Dashboard] outbound: ${(performance.now() - outboundStart).toFixed(2)} ms`);

    const result = {
      summary: {
        missed: (missed as any[]).length,
        answered: (answered as any[]).length,
        outbound: (outbound as any[]).length,
      },
      missedCalls: missed,
      answeredCalls: answered,
      outboundCalls: outbound,
    };

    console.log(`[Dashboard] TOTAL: ${(performance.now() - totalStart).toFixed(2)} ms`);

    return result;
  }
}
