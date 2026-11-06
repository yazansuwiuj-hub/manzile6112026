import { mysqlPool } from '../db/mysql';

export class CallLogsService {
    async getMissedCalls(dateStr: string) {
        console.log(`[CallLogsService] Fetching missed calls for ${dateStr}`);
        const query = `
            SELECT uniqueid, src, disposition, calldate
            FROM cdr
            WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'NO ANSWER'
              AND (lastapp = 'Queue' OR lastapp = 'Dial')
            ORDER BY calldate DESC
            LIMIT 500
        `;

        try {
            const [rows] = await mysqlPool.query(query, [
                `${dateStr} 00:00:00`,
                `${dateStr} 00:00:00`
            ]);
            console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} missed calls`);
            return rows;
        } catch (err: any) {
            console.error(`[CallLogsService] Error fetching missed calls:`, err.message);
            throw err;
        }
    }

    async getAnsweredCalls(dateStr: string) {
        console.log(`[CallLogsService] Fetching answered calls for ${dateStr}`);
        const query = `
            SELECT uniqueid, src, disposition, calldate, duration, dstchannel, wa
            FROM cdr
            WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'ANSWERED'
              AND (lastapp = 'Queue' OR lastapp = 'Dial')
            ORDER BY calldate DESC
            LIMIT 500
        `;

        try {
            const [rows] = await mysqlPool.query(query, [
                `${dateStr} 00:00:00`,
                `${dateStr} 00:00:00`
            ]);
            console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} answered calls`);
            return rows;
        } catch (err: any) {
            console.error(`[CallLogsService] Error fetching answered calls:`, err.message);
            throw err;
        }
    }

    async getOutboundCalls(dateStr: string) {
        console.log(`[CallLogsService] Fetching outbound calls for ${dateStr}`);
        const query = `
            SELECT uniqueid, dst, disposition, calldate, cnam
            FROM cdr
            WHERE calldate >= ?
              AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
              AND disposition = 'ANSWERED'
              AND (outbound_cnum = '0797003356' OR src REGEXP '^[1-9][0-9]{2}$')
            ORDER BY calldate DESC
        `;

        try {
            const [rows] = await mysqlPool.query(query, [
                `${dateStr} 00:00:00`,
                `${dateStr} 00:00:00`
            ]);
            console.log(`[CallLogsService] Found ${Array.isArray(rows) ? rows.length : 0} outbound calls`);
            return rows;
        } catch (err: any) {
            console.error(`[CallLogsService] Error fetching outbound calls:`, err.message);
            throw err;
        }
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
