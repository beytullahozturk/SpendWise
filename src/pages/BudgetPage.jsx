import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Target, Wallet, AlertTriangle, CheckCircle, Edit2, TrendingUp, PiggyBank, Save } from 'lucide-react';
import Modal from '../components/Modal';

const EXPENSE_CATEGORIES = [
    'Market', 'Ulaşım', 'Konut', 'Fatura', 'Eğlence', 'Sağlık', 'Eğitim', 'Giyim', 'Diğer'
];

export default function BudgetPage({ user, filterDate, setFilterDate }) {
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [budgetLimit, setBudgetLimit] = useState('');

    // Fetch Transactions
    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setTransactions(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Fetch Budgets
    useEffect(() => {
        const q = query(
            collection(db, 'budgets'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                data[doc.data().category] = doc.data().limit;
            });
            setBudgets(data);
        });

        return () => unsubscribe();
    }, [user.uid]);

    const handleOpenBudgetModal = (category) => {
        setEditingCategory(category);
        setBudgetLimit(budgets[category] || '');
        setIsModalOpen(true);
    };

    const handleSaveBudget = async (e) => {
        e.preventDefault();

        if (budgetLimit === '' || parseFloat(budgetLimit) < 0) return;

        const numLimit = parseFloat(budgetLimit);
        await setDoc(doc(db, 'budgets', `${user.uid}_${editingCategory}`), {
            uid: user.uid,
            category: editingCategory,
            limit: numLimit
        });

        setIsModalOpen(false);
    };

    // Calculations
    const currentMonthTransactions = transactions.filter(t => {
        let itemDate = t.date;
        if (!itemDate && t.createdAt?.toDate) {
            const d = t.createdAt.toDate();
            itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return itemDate && itemDate.startsWith(filterDate) && t.type === 'expense';
    });

    const categorySpendings = currentMonthTransactions.reduce((acc, t) => {
        const cat = t.category || 'Diğer';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
    }, {});

    // Overall Stats
    let totalBudget = 0;
    let totalSpentInBudgeted = 0;

    Object.entries(budgets).forEach(([cat, limit]) => {
        if (limit > 0) {
            totalBudget += limit;
            totalSpentInBudgeted += (categorySpendings[cat] || 0);
        }
    });

    const totalRemaining = totalBudget - totalSpentInBudgeted;
    const totalPercentage = totalBudget > 0 ? (totalSpentInBudgeted / totalBudget) * 100 : 0;

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Target className="text-indigo-600 dark:text-indigo-400" />
                        Bütçe Planlaması
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aylık harcama hedeflerinizi yönetin ve tasarruf edin.</p>
                </div>

                {/* Date Filter */}
                <input
                    type="month"
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 shadow-sm"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                />
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={64} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Toplam Bütçe Hedefi</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {totalBudget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </h3>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-amber-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Harcanan Tutar</p>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {totalSpentInBudgeted.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </h3>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${totalPercentage > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={64} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kalan Kullanılabilir</p>
                    <h3 className={`text-2xl font-bold mt-1 ${totalRemaining < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {totalRemaining.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">
                        {totalRemaining < 0 ? 'Toplam bütçe hedefini aştınız.' : 'Bütçe hedeflerine göre güvendesiniz.'}
                    </p>
                </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {EXPENSE_CATEGORIES.map(category => {
                    const limit = budgets[category] || 0;
                    const spent = categorySpendings[category] || 0;
                    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                    const remaining = limit - spent;
                    const hasBudget = limit > 0;

                    let statusColor = 'text-slate-400';
                    let barColor = 'bg-slate-200 dark:bg-slate-700';
                    let statusText = 'Bütçe Yok';

                    if (hasBudget) {
                        if (percentage >= 100) {
                            statusColor = 'text-red-500';
                            barColor = 'bg-red-500';
                            statusText = 'Bütçe Aşıldı';
                        } else if (percentage >= 75) {
                            statusColor = 'text-amber-500';
                            barColor = 'bg-amber-500';
                            statusText = 'Dikkat';
                        } else {
                            statusColor = 'text-emerald-500';
                            barColor = 'bg-emerald-500';
                            statusText = 'Güvenli';
                        }
                    }

                    return (
                        <div key={category} className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border transition-all hover:shadow-md ${hasBudget ? 'border-slate-100 dark:border-slate-700' : 'border-dashed border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{category}</h4>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 ${statusColor}`}>
                                        {statusText}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleOpenBudgetModal(category)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                    title="Limiti Düzenle"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-right w-full">
                                        <div className="flex justify-between text-sm mb-1 text-slate-500 dark:text-slate-400">
                                            <span>Harcanan</span>
                                            <span className={percentage > 100 ? 'text-red-500 font-bold' : ''}>{spent.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-1 font-medium text-slate-700 dark:text-slate-300">
                                            <span>Limit</span>
                                            <span>{limit > 0 ? limit.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL' : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    {limit > 0 && (
                                        <div
                                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${barColor}`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        ></div>
                                    )}
                                </div>

                                {hasBudget && (
                                    <div className="flex items-center gap-2 text-xs font-medium pt-1">
                                        {remaining >= 0 ? (
                                            <>
                                                <CheckCircle size={14} className="text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    {remaining.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL harcayabilirsiniz
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={14} className="text-red-500" />
                                                <span className="text-red-600 dark:text-red-400">
                                                    {Math.abs(remaining).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL aştınız
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Budget Setting Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${editingCategory} Bütçesi`}
            >
                <form onSubmit={handleSaveBudget} className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Bu kategori için aylık harcama limiti belirleyin.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Aylık Limit (TL)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="0"
                                step="1"
                                placeholder="0"
                                value={budgetLimit}
                                onChange={(e) => setBudgetLimit(e.target.value)}
                                className="w-full pl-4 pr-12 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-lg"
                                autoFocus
                            />
                            <span className="absolute right-4 top-2.5 text-slate-400 font-medium">TL</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
