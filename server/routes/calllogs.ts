import { Router } from 'express';
import { CallLogsService } from '../services/calllogs.service';
import { CallsService } from '../services/calls.service';
import { mysqlPool } from '../db/mysql';

const router = Router();
const callLogsService = new CallLogsService();
const callsService = new CallsService();

router.get('/missed', async (req, res) => {
    try {
        const dateStr = (req.query.date as string) || '';
        const data = await callLogsService.getMissedCalls(dateStr);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/answered', async (req, res) => {
    try {
        const dateStr = (req.query.date as string) || '';
        const data = await callLogsService.getAnsweredCalls(dateStr);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/outbound', async (req, res) => {
    try {
        const dateStr = (req.query.date as string) || '';
        const data = await callLogsService.getOutboundCalls(dateStr);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { searchTerm } = req.body;
        const data = await callLogsService.searchCustomers(searchTerm || '');
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/dashboard', async (req, res) => {
  try {
    const date = (req.query.date as string) || '';
    const data = await callsService.getDashboard(date);
    res.json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: err.message
    });
  }
});



router.get('/called-list', async (req, res) => {
  try {
    const dateStr = (req.query.date as string) || '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const query = `
      SELECT DISTINCT dst
      FROM cdr
      WHERE calldate >= ?
        AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
        AND dcontext = 'from-internal'
        AND outbound_cnum = '0797003356'
        AND disposition = 'ANSWERED'
        AND dst REGEXP '^07[0-9]{8}$'
    `;

    const [rows] = await mysqlPool.query(query, [
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]) as any;

    res.json(rows.map((r: any) => r.dst));
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-if-called', async (req, res) => {
  try {
    const dst = req.query.dst as string;
    const dateStr = (req.query.date as string) || '';

    if (!/^07[0-9]{8}$/.test(dst || '') ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid destination or date' });
    }

    const query = `
      SELECT COUNT(DISTINCT linkedid) AS count
      FROM cdr
      WHERE dst = ?
        AND calldate >= ?
        AND calldate < DATE_ADD(?, INTERVAL 1 DAY)
        AND dcontext = 'from-internal'
        AND outbound_cnum = '0797003356'
        AND disposition = 'ANSWERED'
    `;

    const [rows] = await mysqlPool.query(query, [
      dst,
      `${dateStr} 00:00:00`,
      `${dateStr} 00:00:00`
    ]) as any;

    res.json({ count: Number(rows[0].count) });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
