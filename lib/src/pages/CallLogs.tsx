import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Download, FileSpreadsheet, PhoneIncoming, PhoneMissed, PhoneOutgoing, Phone } from 'lucide-react';

export function CallLogs() {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState("");
    
    const [grid1, setGrid1] = useState<any[]>([]); // NO ANSWER
    const [grid2, setGrid2] = useState<any[]>([]); // ANSWERED
    const [grid5, setGrid5] = useState<any[]>([]); // OUTBOUND
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [stats, setStats] = useState({
        whoext101: 0, whoext100t: 0, whoext100tn: 0,
        whoext102: 0, ash2: 0, ash2n: 0,
        whoext109: 0, heln: 0, heln2: 0,
        whoext107: 0,
        baqaa: 0,
        whoext104: 0,
        sebak: 0,
        whoext100: 0,
        exten108: 0, mars: 0, marn: 0,
        jarash: 0,
        numVisible: 0
    });

    const [nonoText, setNonoText] = useState("");

    const LinkButton9_Click = async () => {
        setIsProcessing(true);
        try {
            const g1Res = await fetch(`/api/calls/missed?date=${date}`);
            const g1 = await g1Res.json();
            
            const g2Res = await fetch(`/api/calls/answered?date=${date}`);
            const g2 = await g2Res.json();
            
            const g5Res = await fetch(`/api/calls/outbound?date=${date}`);
            const g5 = await g5Res.json();

            let newGrid1 = Array.isArray(g1) ? g1.map((r: any) => ({ ...r, _visible: true, _star: false })) : [];
            let newGrid2 = Array.isArray(g2) ? g2.map((r: any) => ({ ...r, _visible: true, _ext: r.dstchannel })) : [];
            let newGrid5 = Array.isArray(g5) ? g5.map((r: any) => ({ ...r, _visible: true })) : [];

            // AvoidDuplicates
            for (let i = 0; i < newGrid1.length; i++) {
                let myif = 0;
                for (let j = 0; j < newGrid1.length; j++) {
                    if (newGrid1[i].src === newGrid1[j].src) {
                        myif++;
                        if (myif > 1) {
                            newGrid1[j]._visible = false;
                        }
                    }
                }
            }

            // AvoidDuplicates2
            for (let i = 0; i < newGrid2.length; i++) {
                let myif = 0;
                for (let j = 0; j < newGrid2.length; j++) {
                    if (newGrid2[i].src === newGrid2[j].src) {
                        myif++;
                        if (myif > 1) {
                            newGrid2[j]._visible = false;
                        }
                    }
                }
            }

            // AvoidDuplicatesanswer
            for (let i = 0; i < newGrid1.length; i++) {
                for (let j = 0; j < newGrid2.length; j++) {
                    if (newGrid1[i].src === newGrid2[j].src) {
                        newGrid1[i]._visible = false;
                    }
                }
            }

            // AvoidDuplicatesanswery
            for (let i = 0; i < newGrid1.length; i++) {
                for (let j = 0; j < newGrid5.length; j++) {
                    if (newGrid1[i].src === newGrid5[j].src || newGrid1[i].src === newGrid5[j].dst) {
                        newGrid1[i]._visible = false;
                    }
                }
            }

            // extooo
            for (let i = 0; i < newGrid2.length; i++) {
                let currvalue = newGrid2[i].dstchannel;
                if (currvalue) {
                    try {
                        const leftPart = currvalue.split("@")[0];
                        const rightPart = leftPart.split("/")[1];
                        if (rightPart) newGrid2[i]._ext = rightPart;
                    } catch(e) {}
                }
            }

            // extooor
            let newStats = { ...stats };
            for (let k in newStats) newStats[k as keyof typeof newStats] = 0;

            for (let i = 0; i < newGrid2.length; i++) {
                let ext = newGrid2[i]._ext || "";
                let calldate = newGrid2[i].calldate;
                let d = new Date(calldate);
                let timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

                if (ext.length > 0) {
                    if (ext.includes("101")) {
                        newStats.whoext101++;
                        if (timeStr <= "15:30:00") newStats.whoext100t++; else newStats.whoext100tn++;
                    } else if (ext.includes("102")) {
                        newStats.whoext102++;
                        if (timeStr <= "15:30:00") newStats.ash2++; else newStats.ash2n++;
                    } else if (ext.includes("109")) {
                        newStats.whoext109++;
                        if (timeStr <= "15:30:00") newStats.heln++; else newStats.heln2++;
                    } else if (ext.includes("107")) {
                        newStats.whoext107++;
                    } else if (ext.includes("119")) {
                        newStats.baqaa++;
                    } else if (ext.includes("104")) {
                        newStats.whoext104++;
                    } else if (ext.includes("120")) {
                        newStats.sebak++;
                    } else if (ext.includes("112")) {
                        newStats.whoext100++;
                    } else if (ext.includes("108")) {
                        newStats.exten108++;
                        if (timeStr <= "15:30:00") newStats.mars++; else newStats.marn++;
                    } else if (ext.includes("118")) {
                        newStats.jarash++;
                    }
                }
            }

            newStats.numVisible = newGrid1.filter((r: any) => r._visible).length;
            setStats(newStats);

            // ifcalling
            const calledRes = await fetch(`/api/calls/called-list?date=${date}`);
            const calledList = await calledRes.json();
            const calledSet = new Set(calledList);

            let sb = "";
            for (let i = 0; i < newGrid1.length; i++) {
                let currvalue = newGrid1[i].src;
                if (!currvalue || !newGrid1[i]._visible || currvalue === "anonymous") {
                    continue;
                }

                if (calledSet.has(currvalue)) {
                    for (let j = 0; j < newGrid1.length; j++) {
                        if (newGrid1[j].src === currvalue) {
                            newGrid1[j]._visible = false;
                            newGrid1[j]._star = true;
                        }
                    }
                } else {
                    sb += currvalue + "\n";
                }
            }
            setNonoText(sb);

            setGrid1(newGrid1);
            setGrid2(newGrid2);
            setGrid5(newGrid5);

        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };


    useEffect(() => {
        LinkButton9_Click();
    }, []);

    const ExportGridToExcel = () => {
        let csv = "الموبايل,التاريخ,الحالة\n";
        grid1.filter(r => r._visible).forEach(r => {
            let d = new Date(r.calldate);
            csv += `${r.src},${d.toLocaleTimeString()},${r.disposition}\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "GridViewExport.xls";
        a.click();
    };

    const searchby = () => {
        // We will just rely on the searchTerm state to filter in the render loop.
    };

    const q = searchTerm.trim();
    const filteredGrid1 = grid1.filter(r => r._visible && (q === "" || (r.src || "").includes(q)));
    const filteredGrid2 = grid2.filter(r => r._visible && (q === "" || (r.src || "").includes(q) || (r.dst || "").includes(q)));
    const filteredGrid5 = grid5.filter(r => r._visible && (q === "" || (r.src || "").includes(q) || (r.dst || "").includes(q)));

    return (
        <div className="flex flex-col min-h-full w-full space-y-4" dir="rtl">
            {/* Header / Actions Card */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <div className="flex flex-col gap-1.5 w-full md:w-64">
                            <label className="text-sm font-semibold text-slate-700">تاريخ الاتصالات:</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" 
                            />
                        </div>
                        <div className="flex items-end gap-2 w-full md:w-auto">
                            <button 
                                onClick={LinkButton9_Click} 
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl transition-colors font-medium h-[42px]" 
                                disabled={isProcessing}
                            >
                                <Download className="w-4 h-4" />
                                {isProcessing ? 'جاري التحديث...' : 'تحديث'}
                            </button>
                            <button 
                                onClick={ExportGridToExcel} 
                                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl transition-colors font-medium h-[42px]"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                طباعة EXCEL
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-end gap-2 w-full md:w-96">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                placeholder="ابحث..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                        <button 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors font-medium h-[42px]" 
                            onClick={searchby}
                        >
                            بحث
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
                {[
                    { ext: "101", title: "الاشرفية", count: stats.whoext101, d: stats.whoext100t, n: stats.whoext100tn, color: "bg-blue-50 text-blue-700 border-blue-100" },
                    { ext: "102", title: "الاشرفية", count: stats.whoext102, d: stats.ash2, n: stats.ash2n, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
                    { ext: "109", title: "شفا بدران", count: stats.whoext109, d: stats.heln, n: stats.heln2, color: "bg-purple-50 text-purple-700 border-purple-100" },
                    { ext: "107", title: "الزرقاء", count: stats.whoext107, d: "-", n: "-", color: "bg-pink-50 text-pink-700 border-pink-100" },
                    { ext: "104", title: "تلاع العلي", count: stats.whoext104, d: "-", n: "-", color: "bg-rose-50 text-rose-700 border-rose-100" },
                    { ext: "112", title: "طبربور", count: stats.whoext100, d: "-", n: "-", color: "bg-orange-50 text-orange-700 border-orange-100" },
                    { ext: "108", title: "مرج الحمام", count: stats.exten108, d: stats.mars, n: stats.marn, color: "bg-amber-50 text-amber-700 border-amber-100" },
                    { ext: "119", title: "البقعة", count: stats.baqaa, d: "-", n: "-", color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
                    { ext: "120", title: "نادي السباق", count: stats.sebak, d: "-", n: "-", color: "bg-lime-50 text-lime-700 border-lime-100" },
                    { ext: "118", title: "جرش", count: stats.jarash, d: "-", n: "-", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                ].map((stat, i) => (
                    <div key={i} className={`rounded-2xl p-4 border flex flex-col justify-between shadow-sm ${stat.color}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="text-3xl font-bold">{stat.count}</div>
                                <div className="text-xs font-medium opacity-80 mt-1">مكالمة</div>
                            </div>
                            <div className="text-left text-xs font-medium opacity-80 space-y-1">
                                <div>D: {stat.d}</div>
                                <div>N: {stat.n}</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-black/10">
                            <span className="font-bold">{stat.ext}</span>
                            <span className="text-sm font-semibold">{stat.title}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:flex-1 lg:min-h-0 pb-4">
                
                {/* Answered */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] lg:h-full overflow-hidden">
                    <div className="bg-green-50 border-b border-green-100 p-3 text-center shrink-0">
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full font-bold">
                            <PhoneIncoming className="w-4 h-4" />
                            المكالمات الواردة ({filteredGrid2.length})
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto p-4 flex-1">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b-2 border-slate-100 text-slate-500 font-semibold">
                                    <th className="pb-3 pr-2">الموبايل</th>
                                    <th className="pb-3">التاريخ</th>
                                    <th className="pb-3 text-center">الحالة</th>
                                    <th className="pb-3">الموظف</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredGrid2.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${q && (row.src?.includes(q) || row.dst?.includes(q)) ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-3 pr-2 font-mono text-slate-700">{row.src}</td>
                                        <td className="py-3 text-slate-600">{new Date(row.calldate).toLocaleTimeString('en-US', { hour12: false })}</td>
                                        <td className="py-3 text-center">
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">
                                                {row.disposition}
                                            </span>
                                        </td>
                                        <td className="py-3 font-semibold text-slate-700">{row._ext || row.dstchannel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Missed */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] lg:h-full overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 p-3 text-center shrink-0">
                        <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-1.5 rounded-full font-bold">
                            <PhoneMissed className="w-4 h-4" />
                            لم يرد عليها ({filteredGrid1.length})
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto p-4 flex-1">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b-2 border-slate-100 text-slate-500 font-semibold">
                                    <th className="pb-3 pr-2">الموبايل</th>
                                    <th className="pb-3">التاريخ</th>
                                    <th className="pb-3 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredGrid1.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${q && row.src?.includes(q) ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-3 pr-2 font-mono text-slate-700 flex items-center gap-1">
                                            {row._star && <span className="text-red-500 font-bold">*</span>}
                                            {row.src}
                                        </td>
                                        <td className="py-3 text-slate-600">{new Date(row.calldate).toLocaleTimeString('en-US', { hour12: true })}</td>
                                        <td className="py-3 text-center">
                                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">
                                                {row.disposition}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {nonoText && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-mono text-xs whitespace-pre-wrap">
                                {nonoText}
                            </div>
                        )}
                    </div>
                </div>

                {/* Outbound */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[400px] lg:h-full overflow-hidden">
                    <div className="bg-blue-50 border-b border-blue-100 p-3 text-center shrink-0">
                        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-bold">
                            <PhoneOutgoing className="w-4 h-4" />
                            المكالمات الصادرة ({filteredGrid5.length})
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto p-4 flex-1">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="border-b-2 border-slate-100 text-slate-500 font-semibold">
                                    <th className="pb-3 pr-2">الموبايل</th>
                                    <th className="pb-3">التاريخ</th>
                                    <th className="pb-3 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredGrid5.map((row, idx) => (
                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${q && (row.src?.includes(q) || row.dst?.includes(q)) ? 'bg-yellow-50' : ''}`}>
                                        <td className="py-3 pr-2 font-mono text-slate-700">{row.dst}</td>
                                        <td className="py-3 text-slate-600">{new Date(row.calldate).toLocaleTimeString('en-US', { hour12: true })}</td>
                                        <td className="py-3 text-center">
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">
                                                {row.cnam} {row.disposition}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default CallLogs;
