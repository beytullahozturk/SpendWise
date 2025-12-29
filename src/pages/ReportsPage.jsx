import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, Filter, Download, TrendingUp, TrendingDown, DollarSign, Activity, CreditCard } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#6b7280'];

export default function ReportsPage({ user }) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('6M'); // 1M, 3M, 6M, 1Y, ALL

    // Veri Çekme
    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    // Tarih standardizasyonu
                    dateObj: new Date(d.date || d.createdAt?.toDate())
                };
            });
            // Tarihe göre sırala (Eskiden yeniye)
            data.sort((a, b) => a.dateObj - b.dateObj);
            setTransactions(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Veri İşleme
    const processChartData = () => {
        const now = new Date();
        let startDate = new Date();

        // Filtreleme mantığı
        if (timeRange === '1M') startDate.setMonth(now.getMonth() - 1);
        else if (timeRange === '3M') startDate.setMonth(now.getMonth() - 3);
        else if (timeRange === '6M') startDate.setMonth(now.getMonth() - 6);
        else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);
        else startDate = new Date(0); // ALL

        const filtered = transactions.filter(t => t.dateObj >= startDate);

        // Aylık Gruplama
        const monthlyData = {};

        filtered.forEach(t => {
            const key = t.dateObj.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }); // Örn: Ara 2025
            if (!monthlyData[key]) {
                monthlyData[key] = { name: key, income: 0, expense: 0, balance: 0, rawDate: t.dateObj };
            }
            if (t.type === 'income') monthlyData[key].income += t.amount;
            else monthlyData[key].expense += t.amount;
        });

        // Object to Array ve Sıralama
        return Object.values(monthlyData).sort((a, b) => a.rawDate - b.rawDate);
    };

    const processCategoryData = () => {
        // Sadece giderler ve seçili tarih aralığı
        const now = new Date();
        let startDate = new Date();
        if (timeRange === '1M') startDate.setMonth(now.getMonth() - 1);
        else if (timeRange === '3M') startDate.setMonth(now.getMonth() - 3);
        else if (timeRange === '6M') startDate.setMonth(now.getMonth() - 6);
        else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);
        else startDate = new Date(0);

        const expenses = transactions.filter(t => t.type === 'expense' && t.dateObj >= startDate);
        const stats = expenses.reduce((acc, curr) => {
            const cat = curr.category || 'Diğer';
            acc[cat] = (acc[cat] || 0) + curr.amount;
            return acc;
        }, {});

        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 kategori
    };

    const processCardData = () => {
        const now = new Date();
        let startDate = new Date();
        if (timeRange === '1M') startDate.setMonth(now.getMonth() - 1);
        else if (timeRange === '3M') startDate.setMonth(now.getMonth() - 3);
        else if (timeRange === '6M') startDate.setMonth(now.getMonth() - 6);
        else if (timeRange === '1Y') startDate.setFullYear(now.getFullYear() - 1);
        else startDate = new Date(0);

        const expenses = transactions.filter(t =>
            t.type === 'expense' &&
            t.paymentMethod === 'credit_card' &&
            t.dateObj >= startDate
        );

        const stats = expenses.reduce((acc, curr) => {
            const card = curr.cardName || 'Diğer / Genel Kart';
            acc[card] = (acc[card] || 0) + curr.amount;
            return acc;
        }, {});

        // Toplam harcamayı bul (Oran hesaplamak için)
        const total = Object.values(stats).reduce((sum, val) => sum + val, 0);

        return Object.entries(stats)
            .map(([name, value]) => ({
                name,
                value,
                percent: total > 0 ? (value / total) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);
    };

    const calculateSummary = () => {
        const data = processChartData();
        const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
        const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        return {
            totalIncome,
            totalExpense,
            net: totalIncome - totalExpense,
            savingsRate
        };
    };

    const chartData = processChartData();
    const categoryData = processCategoryData();
    const cardData = processCardData();
    const summary = calculateSummary();

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg">
                    <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-slate-500 dark:text-slate-400 capitalize">
                                {entry.name === 'income' ? 'Gelir' : entry.name === 'expense' ? 'Gider' : entry.name}:
                            </span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                                {entry.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Analizler hazırlanıyor...</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="text-indigo-600" />
                    Finansal Raporlar
                </h2>

                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {['1M', '3M', '6M', '1Y', 'ALL'].map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${timeRange === range
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {range === 'ALL' ? 'Tümü' : range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Toplam Gelir</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Toplam Gider</p>
                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Durum</p>
                    <h3 className={`text-2xl font-bold ${summary.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                        {summary.net > 0 ? '+' : ''}{summary.net.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tasarruf Oranı</p>
                    <h3 className="text-2xl font-bold text-amber-500">{summary.savingsRate.toFixed(1)}%</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Ana Grafik - Gelir/Gider Trendi */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Gelir ve Gider Akışı</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Yan Grafik - Kategori Pasta */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Nereye Harcadım?</h3>
                    <div className="h-[300px] w-full relative">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        content={({ payload }) => (
                                            <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs">
                                                {payload.map((entry, index) => (
                                                    <div key={`item-${index}`} className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                        {entry.value}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Veri yok
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detaylı Tablo yerine Aylık Karşılaştırma Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Aylık Net Akış</h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Kredi Kartı Analizi */}
            {cardData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-8">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <CreditCard className="text-amber-600" />
                        Kredi Kartı Harcamaları
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cardData.map((card, index) => (
                            <div key={card.name} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-amber-200 dark:hover:border-amber-800 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-amber-600 shadow-sm">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{card.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${card.percent}%` }}></div>
                                            </div>
                                            <span className="text-xs text-slate-500">%{card.percent.toFixed(0)}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {card.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
