import { mysqlPool } from '../db/mysql';

export class CallLogsService {
    async getMissedCalls(dateStr: string) {
        const query = `SELECT uniqueid,src,disposition,calldate FROM cdr where disposition='NO ANSWER' and calldate LIKE '${dateStr}%'  and lastapp='Queue' ORDER BY calldate DESC`;
        const [rows] = await mysqlPool.query(query);
        return rows;
    }

    async getAnsweredCalls(dateStr: string) {
        const query = `SELECT uniqueid,src,disposition,calldate,duration,dstchannel,wa FROM cdr where disposition='ANSWERED' and calldate LIKE '${dateStr}%' and lastapp='Queue' ORDER BY calldate DESC`;
        const [rows] = await mysqlPool.query(query);
        return rows;
    }

    async getOutboundCalls(dateStr: string) {
        const query = `SELECT uniqueid,dst,disposition,calldate,cnam FROM cdr where disposition='ANSWERED' and calldate LIKE '${dateStr}%' and outbound_cnum='0797003356' ORDER BY calldate DESC`;
        const [rows] = await mysqlPool.query(query);
        return rows;
    }

    async searchCustomers(searchTerm: string) {
        const query = `
            SELECT
                calldate,
                src,
                dst,
                disposition,
                duration,
                billsec,
                cnam,
                uniqueid
            FROM cdr
            WHERE src LIKE ?
               OR dst LIKE ?
            ORDER BY calldate DESC
            LIMIT 200
        `;

        const [rows] = await mysqlPool.query(query, [
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ]);

        return rows;
    }
}
