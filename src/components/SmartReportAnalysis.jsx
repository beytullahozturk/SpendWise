import { useState, useEffect } from 'react';
import {
    Zap,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    Info,
    Lightbulb,
    Activity,
    Award
} from 'lucide-react';

export default function SmartReportAnalysis({ transactions, timeRange, currency = 'TRY' }) {
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
            score: 0,
            tips: [],
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

        // new calculations
        const savingsRate = currentData.income > 0 ? (saving / currentData.income) : 0;

        // 5. Financial Health Score (Basit Algoritma)
        // Başlangıç: 50
        // Tasarruf oranı > %20 (+20 puan), > %10 (+10 puan)
        // Needs oranı %50 civarındaysa (+20 puan) -> abs(50 - needs) farkı kadar düş
        // Borç yoksa (+10 puan) -> expense > income ise (-20 puan)

        let score = 50;
        if (savingsRate >= 0.20) score += 30;
        else if (savingsRate >= 0.10) score += 15;
        else if (savingsRate > 0) score += 5;

        // İhtiyaç Dengesi (50'ye ne kadar yakınsa o kadar iyi)
        const diffNeeds = Math.abs(50 - needsPercent);
        if (diffNeeds < 10) score += 20;
        else if (diffNeeds < 20) score += 10;

        // Bütçe Dengesi
        if (currentData.expense > currentData.income && currentData.income > 0) score -= 20;
        else score += 10;

        if (transactions.length < 5) score = 60; // Yetersiz veri varsa nötr
        score = Math.min(100, Math.max(0, score)); // 0-100 arası

        // 6. Smart Tips
        const tips = [];
        // En yüksek harcama yapılan "İstek" kategorisini bul
        let topWantCat = '';
        let topWantAmount = 0;
        Object.entries(currentData.categories).forEach(([cat, amount]) => {
            if (!NEEDS.includes(cat) && amount > topWantAmount) {
                topWantAmount = amount;
                topWantCat = cat;
            }
        });

        if (topWantCat && topWantAmount > 0) {
            tips.push(`"${topWantCat}" harcamalarını %10 azaltarak ayda ekstra ${(topWantAmount * 0.1).toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 })} biriktirebilirsin.`);
        }

        if (needsPercent > 70) {
            tips.push("Zorunlu giderlerin bütçenin büyük kısmını (%70+) kaplıyor. Sabit giderleri (kira, fatura) gözden geçirmek isteyebilirsin.");
        }

        if (savingsRate < 0.1 && currentData.income > 0) {
            tips.push("Tasarruf oranın %10'un altında. Küçük tutarlarla başlayıp birikim yapmayı deneyebilirsin.");
        }

        if (tips.length === 0) tips.push("Finansal durumun gayet dengeli görünüyor! Böyle devam et.");

        setAnalysis({
            narrative,
            anomalies,
            needsPercent,
            wantsPercent,
            projectedYearly,
            saving,
            score,
            tips,
            hasData: true
        });

    }, [transactions, timeRange]);

    // ...

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1. Yapay Zeka Özeti & İpuçları */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl lg:col-span-2 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Zap className="text-yellow-300 fill-yellow-300" size={20} />
                        </div>
                        <h3 className="font-bold text-lg">Yapay Zeka Analizi</h3>
                    </div>

                    <p className="text-indigo-50 text-lg leading-relaxed font-medium mb-6">
                        {analysis?.narrative}
                    </p>

                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/10 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                            <Lightbulb size={14} />
                            <span>Akıllı Tavsiyeler</span>
                        </div>
                        {analysis?.tips.slice(0, 2).map((tip, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <div className="min-w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2"></div>
                                <p className="text-sm text-white/90 font-medium">{tip}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -marginTop-16"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/30 rounded-full blur-2xl -ml-10 -marginBottom-10"></div>
            </div>

            {/* 2. Finansal Sağlık Skoru */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold z-10">
                    <Activity className="text-rose-500" size={20} />
                    <h3>Finans Puanı</h3>
                </div>

                <div className="relative w-32 h-32 flex items-center justify-center mt-4">
                    {/* Circular Chart Background */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-slate-100 dark:text-slate-700"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={351.86} // 2 * PI * 56
                            strokeDashoffset={351.86 - (351.86 * (analysis?.score || 0)) / 100}
                            className={`${(analysis?.score || 0) > 70 ? 'text-emerald-500' : (analysis?.score || 0) > 40 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-800 dark:text-white">{Math.round(analysis?.score || 0)}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">/ 100</span>
                    </div>
                </div>
                <p className={`mt-4 text-sm font-medium px-3 py-1 rounded-full ${(analysis?.score || 0) > 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    (analysis?.score || 0) > 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {(analysis?.score || 0) > 70 ? 'Mükemmel' : (analysis?.score || 0) > 40 ? 'İdare Eder' : 'Riskli'}
                </p>
            </div>

            {/* 3. Gelecek Tahmini */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <TrendingUp size={100} />
                </div>

                <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-100 font-bold relative z-10">
                    <TrendingUp className="text-blue-500" size={20} />
                    <h3>Gelecek Tahmini</h3>
                </div>

                <div className="flex-1 flex flex-col justify-center relative z-10">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Mevcut hızla yıl sonu:</p>
                    <h4 className={`text-2xl font-bold ${analysis?.projectedYearly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {analysis?.projectedYearly > 0 ? '+' : ''}{analysis?.projectedYearly.toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 })}
                    </h4>

                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                        <div className="flex items-center gap-2 mb-1">
                            <Target size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">İhtiyaç / İstek</span>
                        </div>
                        <div className="flex h-2 w-full rounded-full overflow-hidden">
                            <div className="bg-emerald-500" style={{ width: `${analysis?.needsPercent}%` }} title="İhtiyaç"></div>
                            <div className="bg-amber-500" style={{ width: `${analysis?.wantsPercent}%` }} title="İstek"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>%{analysis?.needsPercent.toFixed(0)} Zorunlu</span>
                            <span>%{analysis?.wantsPercent.toFixed(0)} Keyfi</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
