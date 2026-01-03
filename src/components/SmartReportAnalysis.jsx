import { useState, useEffect } from 'react';
import {
    Zap,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    Info
} from 'lucide-react';

export default function SmartReportAnalysis({ transactions, timeRange }) {
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => {
        // Default / Empty State
        const defaultAnalysis = {
            narrative: "Henüz analiz için yeterli veri bulunmuyor. İşlem ekledikçe burası güncellenecek.",
            anomalies: [],
            needsPercent: 0,
            wantsPercent: 0,
            projectedYearly: 0,
            saving: 0,
            hasData: false
        };

        if (!transactions || transactions.length === 0) {
            setAnalysis(defaultAnalysis);
            return;
        }

        // --- Helper Functions ---
        const getMonthlyData = () => {
            const now = new Date();
            const currentMonthIdx = now.getMonth();
            const lastMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;

            const currentData = { income: 0, expense: 0, categories: {} };
            const lastData = { income: 0, expense: 0, categories: {} };

            transactions.forEach(t => {
                // dateObj ReportsPage'den geliyor, eğer yoksa fallback yapalım
                const d = t.dateObj || (t.date ? new Date(t.date) : (t.createdAt?.toDate ? t.createdAt.toDate() : new Date()));

                // Check if Current Month
                if (d.getMonth() === currentMonthIdx && d.getFullYear() === now.getFullYear()) {
                    if (t.type === 'income') currentData.income += t.amount;
                    else {
                        currentData.expense += t.amount;
                        currentData.categories[t.category] = (currentData.categories[t.category] || 0) + t.amount;
                    }
                }
                // Check if Last Month
                else if (d.getMonth() === lastMonthIdx && (currentMonthIdx === 0 ? d.getFullYear() === now.getFullYear() - 1 : d.getFullYear() === now.getFullYear())) {
                    if (t.type === 'income') lastData.income += t.amount;
                    else {
                        lastData.expense += t.amount;
                        lastData.categories[t.category] = (lastData.categories[t.category] || 0) + t.amount;
                    }
                }
            });

            return { currentData, lastData };
        };

        const { currentData, lastData } = getMonthlyData();

        // 1. Smart Narrative
        let narrative = "Bu ay finansal hareketlerin dengeli görünüyor.";
        if (currentData.expense > lastData.expense && lastData.expense > 0) {
            const increase = ((currentData.expense - lastData.expense) / lastData.expense) * 100;
            narrative = `Bu ay giderlerin geçen aya göre %${increase.toFixed(0)} arttı. Harcamalarını gözden geçirmelisin.`;
        } else if (currentData.expense < lastData.expense && lastData.expense > 0) {
            const decrease = ((lastData.expense - currentData.expense) / lastData.expense) * 100;
            narrative = `Harika! Bu ay geçen aya göre %${decrease.toFixed(0)} daha az harcadın. Tasarruf hedeflerin için süper bir adım.`;
        } else if (currentData.expense === 0 && currentData.income === 0) {
            narrative = "Bu ay henüz işlem kaydın yok. Harcama ekleyerek analizleri başlatabilirsin.";
        }

        // 2. Anomaly Detection
        const anomalies = [];
        Object.entries(currentData.categories).forEach(([cat, amount]) => {
            const lastAmount = lastData.categories[cat] || 0;
            if (lastAmount > 0 && amount > lastAmount * 1.5 && amount > 500) {
                anomalies.push({
                    category: cat,
                    amount: amount,
                    increase: ((amount - lastAmount) / lastAmount) * 100
                });
            } else if (lastAmount === 0 && amount > 1000) {
                // Yeni yüksek harcama kalemi
                anomalies.push({
                    category: cat,
                    amount: amount,
                    increase: 100
                });
            }
        });

        // 3. Needs vs Wants (Simple dictionary based)
        const NEEDS = ['Market', 'Ulaşım', 'Konut', 'Fatura', 'Sağlık', 'Eğitim'];
        let needsTotal = 0;
        let wantsTotal = 0;

        transactions.forEach(t => {
            const d = t.dateObj || (t.date ? new Date(t.date) : new Date());
            // Sadece bu ayın harcamalarına bak
            if (d.getMonth() === (new Date()).getMonth() && t.type === 'expense') {
                if (NEEDS.includes(t.category)) needsTotal += t.amount;
                else wantsTotal += t.amount;
            }
        });

        const totalExp = needsTotal + wantsTotal;
        const needsPercent = totalExp > 0 ? (needsTotal / totalExp) * 100 : 0;
        const wantsPercent = totalExp > 0 ? (wantsTotal / totalExp) * 100 : 0;


        // 4. Future Forecast (Projection)
        const saving = currentData.income - currentData.expense;
        const projectedYearly = saving * 12;

        setAnalysis({
            narrative,
            anomalies,
            needsPercent,
            wantsPercent,
            projectedYearly,
            saving,
            hasData: true
        });

    }, [transactions, timeRange]);

    if (!analysis) return <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl mb-8 text-center text-slate-500 animate-pulse">Yapay Zeka Analizleri Hazırlanıyor...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1. Akıllı Özet KArtı */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg lg:col-span-2 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="text-yellow-300" size={20} />
                        <h3 className="font-bold text-lg">Yapay Zeka Özeti</h3>
                    </div>
                    <p className="text-indigo-50 text-base leading-relaxed font-medium">
                        {analysis.narrative}
                    </p>
                    {analysis.anomalies.length > 0 && (
                        <div className="mt-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                            <p className="text-xs text-indigo-200 uppercase font-bold mb-1">Dikkat Çekenler</p>
                            {analysis.anomalies.map(a => (
                                <div key={a.category} className="flex items-center gap-2 text-sm">
                                    <AlertTriangle size={14} className="text-yellow-300" />
                                    <span>{a.category} harcaması geçen aya göre </span>
                                    <span className="font-bold text-white">
                                        {a.increase === 100 ? 'yeni eklendi!' : `%${(a.increase).toFixed(0)} arttı`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Decorative BG */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            {/* 2. Needs vs Wants */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100 font-bold">
                    <Target className="text-emerald-500" size={20} />
                    <h3>İhtiyaç / İstek Dengesi</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Zorunlu (İhtiyaç)</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">%{(analysis.needsPercent || 0).toFixed(0)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${analysis.needsPercent || 0}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Keyfi (İstek)</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">%{(analysis.wantsPercent || 0).toFixed(0)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${analysis.wantsPercent || 0}%` }}></div>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">
                        *Market, Fatura, Kira vb. zorunlu; Eğlence, Yeme-İçme keyfi olarak analiz edilmiştir. (İdeal: 50/30/20)
                    </p>
                </div>
            </div>

            {/* 3. Gelecek Tahmini */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100 font-bold">
                    <TrendingUp className="text-blue-500" size={20} />
                    <h3>Gelecek Tahmini</h3>
                </div>

                <div className="flex flex-col justify-center h-32">
                    <p className="text-sm text-slate-500 mb-1">Mevcut hızla yıl sonu tahmini:</p>

                    {analysis.projectedYearly > 0 ? (
                        <>
                            <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                +{analysis.projectedYearly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </h4>
                            <p className="text-xs text-emerald-600/80 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg mt-2 font-medium">
                                "Tasarruf modun harika! Birikim hedeflerine yaklaşıyorsun."
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 className="text-2xl font-bold text-red-500">
                                {analysis.projectedYearly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </h4>
                            <p className="text-xs text-red-600/80 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg mt-2 font-medium">
                                "Bütçe açığı var. Harcamaları kısmazsan yıl sonu zor geçebilir."
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
