import { useState, useEffect } from 'react';
import {
    signOut
} from 'firebase/auth';
import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    deleteDoc,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Plus, Trash2, LogOut, Wallet, TrendingUp, TrendingDown, Calendar, Tag, Moon, Sun, Filter, Target, Edit2, BarChart2, Download, CreditCard, Banknote, CheckCircle, Bell, ShoppingCart, Car, Home, Zap, Film, Heart, GraduationCap, ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import TrendModal from '../components/TrendModal';
import { useNavigate } from 'react-router-dom';

// Categories will be fetched from user settings


const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#6b7280'];

export default function Dashboard({ user }) {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [showTrendModal, setShowTrendModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [type, setType] = useState('expense');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'credit_card'
    const [plannedTxns, setPlannedTxns] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Dynamic Categories State
    const [expenseCategories, setExpenseCategories] = useState([
        'Market', 'Ulaşım', 'Konut', 'Fatura', 'Eğlence', 'Sağlık', 'Eğitim', 'Giyim', 'Diğer'
    ]);
    const [incomeCategories, setIncomeCategories] = useState([
        'Maaş', 'Freelance', 'Yatırım', 'Ek Gelir', 'Diğer'
    ]);
    const [creditCards, setCreditCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState('');

    // Fetch User Settings for Categories
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'user_settings', user.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
                if (data.incomeCategories) setIncomeCategories(data.incomeCategories);
                if (data.creditCards) setCreditCards(data.creditCards);
            }
        });
        return () => unsub();
    }, [user.uid]);

    // Fetch Planned Transactions (Realtime)
    useEffect(() => {
        const q = query(
            collection(db, 'planned_transactions'),
            where('uid', '==', user.uid),
            where('isCompleted', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            setPlannedTxns(data);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleCompletePlanned = async (txn) => {
        if (!confirm(`${txn.title} ödemesini tamamlandı olarak işaretlemek istiyor musunuz?`)) return;
        await addDoc(collection(db, 'transactions'), {
            uid: user.uid,
            title: txn.title,
            amount: txn.amount,
            type: 'expense',
            category: txn.category,
            paymentMethod: txn.paymentMethod || 'cash',
            date: txn.date,
            createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'planned_transactions', txn.id), { isCompleted: true });
    };

    const getDaysRemaining = (dateStr) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <span className="text-red-500 font-bold">{Math.abs(diffDays)} gün gecikti</span>;
        if (diffDays === 0) return <span className="text-amber-500 font-bold">Bugün</span>;
        if (diffDays === 1) return <span className="text-amber-500 font-medium">Yarın</span>;
        return <span className="text-indigo-500 font-medium">{diffDays} gün kaldı</span>;
    };

    const getCategoryIcon = (categoryName) => {
        switch (categoryName) {
            case 'Market': return <ShoppingCart size={14} />;
            case 'Ulaşım': return <Car size={14} />;
            case 'Konut': return <Home size={14} />;
            case 'Fatura': return <Zap size={14} />;
            case 'Eğlence': return <Film size={14} />;
            case 'Sağlık': return <Heart size={14} />;
            case 'Eğitim': return <GraduationCap size={14} />;
            case 'Giyim': return <ShoppingBag size={14} />;
            default: return <Tag size={14} />;
        }
    };

    // Dark Mode State
    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Date Filter State use formatted string YYYY-MM
    const [filterDate, setFilterDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    // Verileri çekme (Realtime listener)
    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sıralama
            data.sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt?.toDate());
                const dateB = new Date(b.date || b.createdAt?.toDate());
                return dateB - dateA;
            });

            setTransactions(data);
        }, (error) => {
            console.error("Veri çekme hatası:", error);
        });

        return () => unsubscribe();
    }, [user.uid]);



    // Filtreleme
    useEffect(() => {
        const filtered = transactions.filter(t => {
            let itemDate = t.date; // YYYY-MM-DD formatında olmalı

            // Eğer date alanı yoksa, createdAt'ten üret (Eski veriler için fallback)
            if (!itemDate && t.createdAt?.toDate) {
                const d = t.createdAt.toDate();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                itemDate = `${year}-${month}-${day}`;
            }

            if (!itemDate) return false;

            // YYYY-MM ile başlıyor mu kontrol et
            return itemDate.startsWith(filterDate);
        });
        setFilteredTransactions(filtered);
    }, [transactions, filterDate]);

    // Reset category when type changes
    useEffect(() => {
        setCategory(type === 'expense' ? expenseCategories[0] : incomeCategories[0]);
    }, [type]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!amount || !title) return;

        await addDoc(collection(db, 'transactions'), {
            uid: user.uid,
            title,
            amount: parseFloat(amount),
            type,
            category,
            paymentMethod,
            cardName: paymentMethod === 'credit_card' ? selectedCard : null,
            date,
            createdAt: serverTimestamp()
        });

        setAmount('');
        setTitle('');
        setPaymentMethod('cash');
        setSelectedCard('');
        // Date ve Category'i resetlemiyoruz, kullanıcının seri giriş yapabilmesi için
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, 'transactions', id));
    };



    const handleExport = () => {
        if (filteredTransactions.length === 0) {
            alert('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        // UTF-8 BOM (Excel'in Türkçe karakterleri tanıması için)
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Tarih,Başlık,Kategori,Tutar,Tür\n";

        filteredTransactions.forEach(t => {
            let dateStr = t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('tr-TR') : '-');
            // Eğer date YYYY-MM-DD formatındaysa, TR formatına çevir
            if (t.date) {
                const [y, m, d] = t.date.split('-');
                dateStr = `${d}.${m}.${y}`;
            }

            const row = [
                dateStr,
                `"${t.title.replace(/"/g, '""')}"`, // Tırnak işaretlerini escape et
                t.category,
                t.amount,
                t.type === 'income' ? 'Gelir' : 'Gider'
            ].join(",");
            csvContent += row + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SpendWise_Islemler_${filterDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // İstatistikleri filtrelenmiş veriden hesapla
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    // Kategori analizi (Filtrelenmiş veriden)
    const categoryStats = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => {
            const cat = curr.category || 'Diğer';
            acc[cat] = (acc[cat] || 0) + curr.amount;
            return acc;
        }, {});

    const sortedCategories = Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({
            name,
            value,
            percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0
        }));

    // Global Bakiye Hesaplama (Tüm Zamanlar)
    const globalBalance = transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                {/* Logo Area (Hidden on Desktop because Sidebar has it, showing simplistic title on Mobile or nothing?) 
                    Let's show "Dashboard" title or similar.
                */}
                <div className="flex items-center gap-2 lg:hidden">
                    {/* Mobile Logo */}
                    <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                        <Wallet size={20} />
                    </div>
                    <h1 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">SpendWise</h1>
                </div>

                {/* Desktop Title (Optional) */}
                <h2 className="hidden lg:block text-2xl font-bold text-slate-800 dark:text-slate-100">Genel Bakış</h2>

                <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 w-full md:w-auto">
                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="p-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                        title="CSV Olarak İndir"
                    >
                        <Download size={20} />
                        <span className="hidden sm:inline font-medium">İndir</span>
                    </button>

                    {/* Trend Button */}
                    <button
                        onClick={() => setShowTrendModal(true)}
                        className="p-2 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                        <BarChart2 size={20} />
                        <span className="hidden sm:inline font-medium">Trendler</span>
                    </button>

                    {/* Date Filter */}
                    <div className="relative">
                        <input
                            type="month"
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 transition-all shadow-sm w-full sm:w-auto"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                        <Calendar className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                    </div>

                    {/* Notification Center */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                        >
                            <Bell size={20} />
                            {plannedTxns.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                                    {plannedTxns.length}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Finansal Asistan</h3>
                                    <button onClick={() => navigate('/calendar')} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Takvime Git</button>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto p-2 space-y-4">
                                    {plannedTxns.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">
                                            <Bell className="mx-auto mb-2 opacity-50" size={24} />
                                            <p>Harika! Planlanmış ödemeniz yok.</p>
                                        </div>
                                    ) : (
                                        (() => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);

                                            const groups = plannedTxns.reduce((acc, txn) => {
                                                const txnDate = new Date(txn.date);
                                                txnDate.setHours(0, 0, 0, 0);
                                                const diffDays = Math.ceil((txnDate - today) / (1000 * 60 * 60 * 24));

                                                if (diffDays < 0) acc.overdue.push(txn);
                                                else if (diffDays <= 1) acc.upcoming.push(txn);
                                                else acc.future.push(txn);
                                                return acc;
                                            }, { overdue: [], upcoming: [], future: [] });

                                            const renderGroup = (title, items, titleColor) => (
                                                items.length > 0 && (
                                                    <div className="space-y-1">
                                                        <h4 className={`text-[10px] uppercase font-bold tracking-wider px-2 ${titleColor}`}>{title}</h4>
                                                        {items.map(txn => (
                                                            <div key={txn.id} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors flex justify-between items-center group">
                                                                <div className="min-w-0 flex-1 pr-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="p-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                                                            {getCategoryIcon(txn.category)}
                                                                        </span>
                                                                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{txn.title}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 pl-7">
                                                                        <span>{new Date(txn.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                                                            {getDaysRemaining(txn.date)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{txn.amount.toLocaleString('tr-TR')} ₺</span>

                                                                    <button
                                                                        onClick={() => handleCompletePlanned(txn)}
                                                                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full transition-all"
                                                                        title="Ödendi Olarak İşaretle"
                                                                    >
                                                                        <CheckCircle size={18} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            );

                                            return (
                                                <>
                                                    {renderGroup('Gecikenler', groups.overdue, 'text-red-500')}
                                                    {renderGroup('Yaklaşanlar', groups.upcoming, 'text-amber-500')}
                                                    {renderGroup('Gelecek Planlar', groups.future, 'text-emerald-500')}
                                                </>
                                            );
                                        })()
                                    )}
                                </div>

                                {plannedTxns.length > 0 && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs font-medium">
                                        <span className="text-slate-500">Toplam Bekleyen</span>
                                        <span className="text-slate-800 dark:text-slate-200 text-sm">
                                            {plannedTxns.reduce((sum, t) => sum + t.amount, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dark Mode Toggle */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={() => signOut(auth)}
                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Çıkış Yap"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Modal */}
            {showTrendModal && (
                <TrendModal
                    transactions={transactions}
                    onClose={() => setShowTrendModal(false)}
                    darkMode={darkMode}
                />
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-indigo-100 font-medium mb-1">Dönem Bakiyesi</p>
                            <h2 className="text-3xl font-bold">{balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h2>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Wallet size={24} className="text-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-indigo-100 bg-white/10 p-2 rounded-lg backdrop-blur-sm inline-flex">
                        <Wallet size={14} />
                        <span>Toplam Varlık: {globalBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors duration-300">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Gelirler</p>
                        <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h2>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors duration-300">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Giderler</p>
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">-{totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h2>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                        <TrendingDown size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form & Stats */}
                <div className="lg:col-span-1 space-y-6">








                    {/* Add Transaction Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Plus className="text-indigo-600 dark:text-indigo-400" size={20} />
                            İşlem Ekle
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('expense')}
                                    className={`py-2 px-4 rounded-lg font-medium transition-all ${type === 'expense' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 border ring-1 ring-red-200 dark:ring-red-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                >
                                    Gider
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('income')}
                                    className={`py-2 px-4 rounded-lg font-medium transition-all ${type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 border ring-1 ring-emerald-200 dark:ring-emerald-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                >
                                    Gelir
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tarih</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {(type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <Tag className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                                <input
                                    type="text"
                                    placeholder={type === 'expense' ? 'Örn: Market Fişi' : 'Örn: Mart Ayı Maaşı'}
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Miktar</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    required
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            {/* Payment Method Selection (Only for Expenses) */}
                            {type === 'expense' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ödeme Yöntemi</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${paymentMethod === 'cash'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent'
                                                }`}
                                        >
                                            <Banknote size={16} /> Nakit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('credit_card')}
                                            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${paymentMethod === 'credit_card'
                                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                                : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent'
                                                }`}
                                        >
                                            <CreditCard size={16} /> Kredi Kartı
                                        </button>
                                    </div>

                                    {/* Specific Card Selection */}
                                    {paymentMethod === 'credit_card' && creditCards.length > 0 && (
                                        <div className="mt-3 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                                            <label className="block text-xs font-medium text-amber-800 mb-2">Hangi Kart?</label>
                                            <div className="flex flex-wrap gap-2">
                                                {creditCards.map(card => (
                                                    <button
                                                        key={card}
                                                        type="button"
                                                        onClick={() => setSelectedCard(card)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${selectedCard === card
                                                            ? 'bg-amber-100 border border-amber-300 text-amber-800 shadow-sm'
                                                            : 'bg-white border border-amber-200 text-amber-600 hover:bg-white hover:border-amber-300'
                                                            }`}
                                                    >
                                                        <CreditCard size={12} />
                                                        {card}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Plus size={18} />
                                Ekle
                            </button>
                        </form>
                    </div>

                    {/* Category Analysis Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <TrendingDown className="text-indigo-600 dark:text-indigo-400" size={20} />
                            Harcama Analizi
                        </h3>
                        {sortedCategories.length > 0 ? (
                            <div className="space-y-6">
                                {/* Pie Chart */}
                                <div className="h-48 w-full min-w-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sortedCategories}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {sortedCategories.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ color: '#1e293b' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* List */}
                                <div className="space-y-4">
                                    {sortedCategories.map((cat, index) => (
                                        <div key={cat.name}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                                                </div>
                                                <span className="font-semibold text-slate-900 dark:text-slate-100">{cat.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center text-sm py-4">Bu dönem için harcama kaydı yok.</p>
                        )}
                    </div>


                </div>

                {/* Transaction History */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">İşlemler ({filteredTransactions.length})</h3>

                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-3">
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-full">
                                    <Wallet size={32} className="opacity-50" />
                                </div>
                                <p>Bu dönem için kayıt bulunamadı.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredTransactions.map(t => (
                                    <div key={t.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-md transition-all bg-slate-50/50 dark:bg-slate-700/30 hover:bg-white dark:hover:bg-slate-700">
                                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                            <div className="flex-shrink-0 p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                {t.type === 'income' ? <TrendingUp size={20} className="text-emerald-500" /> : <TrendingDown size={20} className="text-red-500" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{t.title}</p>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    <span className="bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                                        {t.category || (t.type === 'income' ? 'Gelir' : 'Gider')}
                                                    </span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="whitespace-nowrap">{new Date(t.date || t.createdAt?.toDate()).toLocaleDateString('tr-TR')}</span>

                                                    {/* Payment Method Icon */}
                                                    {t.type === 'expense' && (
                                                        <>
                                                            <span className="hidden sm:inline">•</span>
                                                            <span className={`flex items-center gap-1 ${t.paymentMethod === 'credit_card' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {t.paymentMethod === 'credit_card' ? <CreditCard size={12} /> : <Banknote size={12} />}
                                                                <span className="hidden sm:inline">{t.paymentMethod === 'credit_card' ? 'Kredi Kartı' : 'Nakit'}</span>
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-4 ml-2">
                                            <span className={`font-bold text-sm sm:text-lg whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {t.type === 'income' ? '+' : '-'}{Math.abs(t.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                                title="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
