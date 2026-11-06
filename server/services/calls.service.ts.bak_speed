import { mysqlPool } from "../db/mysql";

export class CallsService {

  async getDashboard(date: string) {

    const likeDate = `${date}%`;

    const [missed] = await mysqlPool.query(
      `SELECT uniqueid,src,dst,calldate,disposition
       FROM cdr
       WHERE disposition='NO ANSWER'
       AND lastapp='Queue'
       AND calldate LIKE ?
       ORDER BY calldate DESC`,
      [likeDate]
    );

    const [answered] = await mysqlPool.query(
      `SELECT uniqueid,src,dst,dstchannel,calldate,duration,billsec,disposition
       FROM cdr
       WHERE disposition='ANSWERED'
       AND lastapp='Queue'
       AND calldate LIKE ?
       ORDER BY calldate DESC`,
      [likeDate]
    );

    const [outbound] = await mysqlPool.query(
      `SELECT uniqueid,dst,cnam,calldate,disposition
       FROM cdr
       WHERE disposition='ANSWERED'
       AND outbound_cnum='0797003356'
       AND calldate LIKE ?
       ORDER BY calldate DESC`,
      [likeDate]
    );

    return {
      summary: {
        missed: (missed as any[]).length,
        answered: (answered as any[]).length,
        outbound: (outbound as any[]).length,
      },
      missedCalls: missed,
      answeredCalls: answered,
      outboundCalls: outbound,
    };
  }
}
