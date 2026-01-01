import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Plus, DollarSign, Wallet, RefreshCw, Briefcase, ArrowUpRight, ArrowDownRight, Edit2, Trash2, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Modal from '../components/Modal';

const ASSET_TYPES = [
    { id: 'gold', label: 'Altın (Gr)', color: '#fbbf24' },
    { id: 'usd', label: 'Dolar ($)', color: '#22c55e' },
    { id: 'eur', label: 'Euro (€)', color: '#3b82f6' },
    { id: 'stock', label: 'Hisse Senedi', color: '#6366f1' },
    { id: 'crypto', label: 'Kripto Para', color: '#8b5cf6' },
    { id: 'cash', label: 'Nakit (TL)', color: '#94a3b8' },
    { id: 'other', label: 'Diğer', color: '#ec4899' }
];

const DEFAULT_RATES = {
    gold: 0,
    usd: 0,
    eur: 0
};

export default function InvestmentsPage({ user }) {
    const [assets, setAssets] = useState([]);
    const [marketRates, setMarketRates] = useState(DEFAULT_RATES);
    const [loading, setLoading] = useState(true);
    const [loadingRates, setLoadingRates] = useState(false);

    const fetchRates = async () => {
        setLoadingRates(true);
        try {
            // 1. Fetch Fiat Rates (USD Base)
            const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
            const fiatData = await fiatRes.json();

            if (!fiatData || !fiatData.rates) throw new Error('Döviz verisi alınamadı');

            const usdTry = fiatData.rates.TRY;
            const eurUsd = 1 / fiatData.rates.EUR;
            const eurTry = eurUsd * usdTry;

            // 2. Fetch Crypto & Gold (PAXG)
            // PAX Gold (PAXG) is a gold-backed token, 1 PAXG ≈ 1 Troy Ounce Gold
            const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,bitcoin,ethereum&vs_currencies=usd');
            const cryptoData = await cryptoRes.json();

            if (!cryptoData || !cryptoData['pax-gold']) throw new Error('Altın verisi alınamadı');

            const paxgUsd = cryptoData['pax-gold'].usd;

            // Calculate Gram Gold (TL)
            // Formula: (Oz Price USD / 31.1035) * USD/TRY
            const gramGoldTry = (paxgUsd / 31.1035) * usdTry;

            setMarketRates(prev => ({
                ...prev,
                gold: parseFloat(gramGoldTry.toFixed(2)),
                usd: parseFloat(usdTry.toFixed(4)),
                eur: parseFloat(eurTry.toFixed(4))
            }));

            alert('Piyasa kurları başarıyla güncellendi!');
        } catch (err) {
            console.error(err);
            alert('Veri çekilemedi. API limitine takılmış olabilirsiniz, lütfen biraz bekleyin.');
        } finally {
            setLoadingRates(false);
        }
    };

    // Modal States
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showRateModal, setShowRateModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        type: 'gold',
        name: '', // For stocks/crypto
        amount: '',
        avgCost: ''
    });

    // Fetch Assets
    useEffect(() => {
        const q = query(collection(db, 'investments'), where('uid', '==', user.uid));
        const unsub = onSnapshot(q, (snapshot) => {
            setAssets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user.uid]);

    // Fetch Market Rates (Stored in user settings for persistency)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'user_settings', user.uid), (doc) => {
            if (doc.exists() && doc.data().marketRates) {
                setMarketRates(prev => ({ ...prev, ...doc.data().marketRates }));
            }
        });
        return () => unsub();
    }, [user.uid]);

    // Calculate current value of an asset
    const getCurrentPrice = (asset) => {
        if (asset.type === 'cash') return 1; // 1 TL = 1 TL
        // For custom types or untracked rates, user might want to manually update or we fallback to cost
        // Here we use the manually entered market rates for standard types
        if (marketRates[asset.type] > 0) return marketRates[asset.type];

        // If it's a specific stock/crypto that doesn't have a global rate, 
        // in V1 we might fallback to avgCost or assume user updates "current price" manually per asset.
        // For simplicity, let's assume 'stock'/'crypto' types also rely on a manually entered "current price" 
        // but since we only have global rates for gold/usd/eur, let's handle "Custom Rate" logic later.
        // Fallback: If no rate, Profit/Loss cannot be calculated accurately, show 0.
        return asset.currentPrice || 0;
    };

    const calculatePortfolio = () => {
        let totalValue = 0;
        let totalCost = 0;

        const assetDetails = assets.map(asset => {
            // Priority: Rate from Type (Gold/USD/EUR) -> Rate saved specifically for this asset (Stocks) -> AvgCost (No Profit)
            let price = 0;
            if (['gold', 'usd', 'eur'].includes(asset.type)) {
                price = marketRates[asset.type];
            } else {
                // For stocks/crypto, we currently lack a "Current Price" field per asset in this simple version.
                // Let's add that to the form or assume for now "Market Rate" is not available = No P/L
                price = asset.currentPrice || asset.avgCost;
            }

            const currentValue = asset.amount * price;
            const costValue = asset.amount * asset.avgCost;

            totalValue += currentValue;
            totalCost += costValue;

            return {
                ...asset,
                currentValue,
                profit: currentValue - costValue,
                profitPercent: costValue > 0 ? ((currentValue - costValue) / costValue) * 100 : 0
            };
        });

        return { totalValue, totalCost, items: assetDetails };
    };

    const portfolio = calculatePortfolio();
    const totalProfit = portfolio.totalValue - portfolio.totalCost;
    const totalProfitRate = portfolio.totalCost > 0 ? (totalProfit / portfolio.totalCost) * 100 : 0;

    // Handlers
    const handleSaveAsset = async (e) => {
        e.preventDefault();
        const data = {
            uid: user.uid,
            type: formData.type,
            name: formData.name || ASSET_TYPES.find(t => t.id === formData.type)?.label,
            amount: parseFloat(formData.amount),
            avgCost: parseFloat(formData.avgCost),
            // For stocks/crypto, let user define a "current price" initially equal to cost if they want
            currentPrice: parseFloat(formData.currentPrice || formData.avgCost)
        };

        if (editingAsset) {
            await setDoc(doc(db, 'investments', editingAsset.id), data, { merge: true });
        } else {
            await setDoc(doc(collection(db, 'investments')), data);
        }
        setShowAssetModal(false);
        resetForm();
    };

    const handleDelete = async (id) => {
        if (confirm('Bu varlığı portföyden kaldırmak istiyor musunuz?')) {
            await deleteDoc(doc(db, 'investments', id));
        }
    };

    const handleUpdateRates = async (e) => {
        e.preventDefault();
        await setDoc(doc(db, 'user_settings', user.uid), { marketRates }, { merge: true });
        setShowRateModal(false);
    };

    const resetForm = () => {
        setFormData({ type: 'gold', name: '', amount: '', avgCost: '', currentPrice: '' });
        setEditingAsset(null);
    };

    const openEdit = (asset) => {
        setEditingAsset(asset);
        setFormData({
            type: asset.type,
            name: asset.name,
            amount: asset.amount,
            avgCost: asset.avgCost,
            currentPrice: asset.currentPrice
        });
        setShowAssetModal(true);
    };

    // Chart Data
    const chartData = portfolio.items.map(i => ({
        name: i.name,
        value: i.currentValue,
        color: ASSET_TYPES.find(t => t.id === i.type)?.color || '#999'
    })).filter(i => i.value > 0);

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Briefcase className="text-indigo-600 dark:text-indigo-400" />
                        Yatırım Portföyü
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Varlıklarınızı takip edin, kâr/zarar durumunuzu yönetin.</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowRateModal(true)}
                        className="flex-1 md:flex-none py-2 px-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
                    >
                        <RefreshCw size={18} />
                        Kurları Güncelle
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowAssetModal(true); }}
                        className="flex-1 md:flex-none py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-indigo-500/30"
                    >
                        <Plus size={18} />
                        Varlık Ekle
                    </button>
                </div>
            </div>

            {/* Portfolio Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Value */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-900 dark:to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Toplam Portföy Değeri</p>
                            <h2 className="text-3xl font-bold tracking-tight">
                                {portfolio.totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </h2>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Wallet size={24} className="text-indigo-400" />
                        </div>
                    </div>
                </div>

                {/* Profit/Loss */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Kâr / Zarar</p>
                        {totalProfit >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingUp className="text-red-500 rotate-180" />}
                    </div>
                    <div className="flex items-end gap-3">
                        <h2 className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </h2>
                        <span className={`text-sm font-bold mb-1.5 px-2 py-0.5 rounded ${totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            %{totalProfitRate.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Maliyet: {portfolio.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                </div>

                {/* Distribution Chart (Mini) */}
                <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={120}>
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-slate-400 text-xs text-center p-4">Veri Yok</div>
                    )}
                </div>
            </div>

            {/* Assets Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Varlıklarım</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Varlık</th>
                                <th className="px-6 py-4">Miktar</th>
                                <th className="px-6 py-4">Ort. Maliyet</th>
                                <th className="px-6 py-4">Anlık Değer</th>
                                <th className="px-6 py-4">Kâr / Zarar</th>
                                <th className="px-6 py-4 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {portfolio.items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                        Henüz portföyüne varlık eklemedin.
                                    </td>
                                </tr>
                            ) : (
                                portfolio.items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: ASSET_TYPES.find(t => t.id === item.type)?.color }}></div>
                                            <div>
                                                {item.name}
                                                <div className="text-xs text-slate-400 font-normal">{ASSET_TYPES.find(t => t.id === item.type)?.label}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">
                                            {item.amount} <span className="text-xs text-slate-400">{item.type === 'gold' ? 'gr' : ''}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {item.avgCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                                            {item.currentValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1 ${item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {item.profit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                <span className="font-semibold">{Math.abs(item.profit).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
                                            </div>
                                            <span className={`text-xs ${item.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                %{item.profitPercent.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Asset Modal */}
            <Modal
                isOpen={showAssetModal}
                onClose={() => setShowAssetModal(false)}
                title={editingAsset ? "Varlık Düzenle" : "Yeni Varlık Ekle"}
            >
                <form onSubmit={handleSaveAsset} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Varlık Türü</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={!!editingAsset}
                        >
                            {ASSET_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {['stock', 'crypto', 'other'].includes(formData.type) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Varlık Adı / Sembolü</label>
                            <input
                                type="text"
                                required
                                placeholder="Örn: ASELS, BTC, ETH..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* For Stock/Crypto manually update current price */}
                    {['stock', 'crypto', 'other'].includes(formData.type) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Güncel Birim Fiyat (TL)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="any"
                                value={formData.currentPrice}
                                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-slate-400 mt-1">Kâr/Zarar hesabı için güncel fiyatı manuel giriniz.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Miktar (Adet/Bakiye)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ortalama Alış Maliyeti (Birim Başı TL)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={formData.avgCost}
                            onChange={(e) => setFormData({ ...formData, avgCost: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all">
                        Kaydet
                    </button>
                </form>
            </Modal>

            {/* Rates Modal */}
            <Modal
                isOpen={showRateModal}
                onClose={() => setShowRateModal(false)}
                title="Piyasa Kurlarını Güncelle"
            >
                <form onSubmit={handleUpdateRates} className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm mb-4">
                        <p>Kurları manuel girebilir veya "Otomatik Getir" butonunu kullanarak güncel piyasa verilerini çekebilirsiniz.</p>
                        <p className="text-xs mt-1 opacity-70">*Altın fiyatı uluslararası piyasalara göre (PAX Gold endeksli) hesaplanır, banka kurlarından farklılık gösterebilir.</p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchRates}
                        disabled={loadingRates}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 font-medium mb-4"
                    >
                        {loadingRates ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        {loadingRates ? 'Veriler Çekiliyor...' : 'Otomatik Getir (API)'}
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gram Altın (TL)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={marketRates.gold}
                            onChange={(e) => setMarketRates({ ...marketRates, gold: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dolar / TL</label>
                        <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={marketRates.usd}
                            onChange={(e) => setMarketRates({ ...marketRates, usd: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Euro / TL</label>
                        <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={marketRates.eur}
                            onChange={(e) => setMarketRates({ ...marketRates, eur: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all">
                        Kurları Kaydet
                    </button>
                </form>
            </Modal>
        </div>
    );
}
