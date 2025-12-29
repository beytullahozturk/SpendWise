import { useState } from 'react';
import { BarChart2, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function TrendModal({ transactions, onClose, darkMode }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [monthCount, setMonthCount] = useState(6);

    const monthlyStats = (() => {
        const stats = {};
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

        const now = new Date();
        const isCurrentYear = year === now.getFullYear();
        const endMonthIndex = isCurrentYear ? now.getMonth() : 11; // 0-11

        let displayData = [];

        for (let i = monthCount - 1; i >= 0; i--) {
            const targetMonthIndex = endMonthIndex - i;
            if (targetMonthIndex < 0) continue;

            const key = `${year}-${String(targetMonthIndex + 1).padStart(2, '0')}`;
            displayData.push({
                key,
                name: monthNames[targetMonthIndex],
                income: 0,
                expenseCash: 0,
                expenseCard: 0
            });
        }

        // Verileri doldur
        transactions.forEach(t => {
            let itemDate = t.date;
            if (!itemDate && t.createdAt?.toDate) {
                const d = t.createdAt.toDate();
                itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            if (!itemDate) return;

            const txnKey = itemDate.slice(0, 7); // YYYY-MM

            const stat = displayData.find(d => d.key === txnKey);
            if (stat) {
                if (t.type === 'income') {
                    stat.income += t.amount;
                } else if (t.type === 'expense') {
                    // Backward compatibility: If no paymentMethod, assume cash or just group it
                    if (t.paymentMethod === 'credit_card') {
                        stat.expenseCard += t.amount;
                    } else {
                        stat.expenseCash += t.amount;
                    }
                }
            }
        });

        return displayData;
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BarChart2 className="text-indigo-600 dark:text-indigo-400" size={24} />
                        Gelir - Gider Trend Analizi
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Yıl</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ay Sayısı</label>
                            <select
                                value={monthCount}
                                onChange={(e) => setMonthCount(parseInt(e.target.value))}
                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value={3}>Son 3 Ay</option>
                                <option value={6}>Son 6 Ay</option>
                                <option value={9}>Son 9 Ay</option>
                                <option value={12}>Tüm Yıl</option>
                            </select>
                        </div>
                    </div>

                    <div className="h-80 w-full min-w-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={monthlyStats}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} />
                                <XAxis
                                    dataKey="name"
                                    stroke={darkMode ? "#94a3b8" : "#64748b"}
                                    tick={{ fill: darkMode ? "#94a3b8" : "#64748b" }}
                                />
                                <YAxis
                                    stroke={darkMode ? "#94a3b8" : "#64748b"}
                                    tick={{ fill: darkMode ? "#94a3b8" : "#64748b" }}
                                    tickFormatter={(value) => `₺${value}`}
                                />
                                <Tooltip
                                    formatter={(value) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#1e293b' : 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        color: darkMode ? '#f1f5f9' : '#1e293b'
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar name="Gelir" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                                {/* Stacked Expenses */}
                                <Bar name="Gider (Nakit)" dataKey="expenseCash" stackId="expense" fill="#ef4444" radius={[0, 0, 4, 4]} barSize={32} />
                                <Bar name="Gider (K. Kartı)" dataKey="expenseCard" stackId="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
