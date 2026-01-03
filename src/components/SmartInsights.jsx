import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Lightbulb, TrendingUp, AlertTriangle, PiggyBank, CreditCard, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SmartInsights({ user, transactions }) {
    const navigate = useNavigate();
    const [tips, setTips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!user || !transactions) return;

        const generateInsights = async () => {
            const newTips = [];
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // 1. Abonelik Analizi
            try {
                const subQuery = query(collection(db, 'subscriptions'), where('uid', '==', user.uid), where('status', '==', 'active'));
                const subSnap = await getDocs(subQuery);
                const subs = subSnap.docs.map(d => d.data());

                const totalSubCost = subs.reduce((acc, s) => acc + s.price, 0);
                if (subs.length >= 3) {
                    newTips.push({
                        id: 'subs_overload',
                        type: 'warning',
                        icon: <CreditCard className="text-amber-500" size={24} />,
                        title: 'Abonelik Kontrolü',
                        message: `Toplam ${subs.length} aktif aboneliğin var ve aylık ${totalSubCost.toLocaleString('tr-TR')} TL ödüyorsun. Kullanmadıklarını iptal etmeyi düşünebilirsin.`,
                        actionLabel: 'Abonelikleri İncele',
                        actionLink: '/subscriptions'
                    });
                }
            } catch (error) {
                console.error("Subs check error", error);
            }

            // 2. Bütçe Analizi (Bu Ay)
            try {
                const budgetQuery = query(collection(db, 'budgets'), where('uid', '==', user.uid));
                const budgetSnap = await getDocs(budgetQuery);
                const budgets = budgetSnap.docs.map(d => d.data());

                // Bu ayki harcamaları hesapla
                const currentMonthExpenses = transactions.filter(t => {
                    const d = t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split('T')[0] : '');
                    return t.type === 'expense' && d.startsWith(currentMonthStr);
                });

                const expenseByCat = currentMonthExpenses.reduce((acc, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.amount;
                    return acc;
                }, {});

                budgets.forEach(b => {
                    const spent = expenseByCat[b.category] || 0;
                    if (b.limit > 0 && spent > b.limit * 0.9) {
                        newTips.push({
                            id: `budget_${b.category}`,
                            type: 'danger',
                            icon: <AlertTriangle className="text-red-500" size={24} />,
                            title: `${b.category} Limiti`,
                            message: `${b.category} bütçenin %${((spent / b.limit) * 100).toFixed(0)}'ini tükettin. Dikkatli olmalısın.`,
                            actionLabel: 'Bütçeyi Gör',
                            actionLink: '/budget'
                        });
                    }
                });
            } catch (error) {
                console.error("Budget check error", error);
            }

            // 3. Tasarruf / Yatırım Fırsatı
            // Son 3 ayın gelir/gider dengesine bak
            const monthlyStats = {};
            transactions.forEach(t => {
                const d = t.date ? new Date(t.date) : (t.createdAt?.toDate ? t.createdAt.toDate() : new Date());
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };
                if (t.type === 'income') monthlyStats[key].income += t.amount;
                else monthlyStats[key].expense += t.amount;
            });

            // Son ay (geçen ay) pozitifse öneri yap
            const lastMonthKey = `${now.getFullYear()}-${now.getMonth() - 1}`; // Basit yaklaşım, yıl dönüşüne dikkat edilmeli ama şimdilik yeterli
            // Daha sağlam: Son 30-60 gün
            const recentIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const recentExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            const savings = recentIncome - recentExpense;

            if (savings > 1000) { // Basit eşik değer
                newTips.push({
                    id: 'invest_opportunity',
                    type: 'success',
                    icon: <PiggyBank className="text-emerald-500" size={24} />,
                    title: 'Yatırım Fırsatı',
                    message: `Gelirlerin giderlerinden fazla gidiyor. Artan parayı değerlendirmek için portföy oluşturabilirsin.`,
                    actionLabel: 'Yatırımlara Git',
                    actionLink: '/investments'
                });
            }

            // 4. Kredi Kartı Kullanımı
            const creditCardExpenses = currentMonthExpenses.filter(t => t.paymentMethod === 'credit_card');
            const totalCC = creditCardExpenses.reduce((acc, t) => acc + t.amount, 0);
            const totalExp = currentMonthExpenses.reduce((acc, t) => acc + t.amount, 0);

            if (totalExp > 0 && (totalCC / totalExp) > 0.7) {
                newTips.push({
                    id: 'cc_warning',
                    type: 'warning',
                    icon: <CreditCard className="text-amber-600" size={24} />,
                    title: 'Yüksek Kredi Kartı Kullanımı',
                    message: `Bu ay harcamalarının %${((totalCC / totalExp) * 100).toFixed(0)}'sini kredi kartıyla yaptın. Nakit akışını kontrol etmelisin.`,
                    actionLabel: 'Analizi Gör',
                    actionLink: '/reports'
                });
            }

            // Eğer hiç tip yoksa default bir tip ekle
            if (newTips.length === 0) {
                newTips.push({
                    id: 'all_good',
                    type: 'info',
                    icon: <TrendingUp className="text-indigo-500" size={24} />,
                    title: 'Her Şey Yolunda',
                    message: 'Finansal durumun dengeli görünüyor. Harika gidiyorsun! 🚀',
                    actionLabel: 'Raporları İncele',
                    actionLink: '/reports'
                });
            }

            setTips(newTips);
            setLoading(false);
        };

        generateInsights();
    }, [user, transactions]);

    const nextTip = () => {
        setCurrentIndex((prev) => (prev + 1) % tips.length);
    };

    const prevTip = () => {
        setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length);
    };

    if (loading) return null; // Yüklenirken gösterme veya skeleton koy

    const tip = tips[currentIndex];

    return (
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            {/* Header / Title - Optional small tag */}
            <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg z-10">
                Finansal Asistanın
            </div>

            <div className="flex items-center">
                {/* Left Arrow */}
                {tips.length > 1 && (
                    <button onClick={prevTip} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                )}

                {/* Content */}
                <div className="flex-1 p-4 pl-2 md:pl-6 flex flex-col md:flex-row items-start md:items-center gap-4 min-h-[100px]">
                    <div className={`p-3 rounded-full shrink-0 ${tip.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                            tip.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20' :
                                tip.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                                    'bg-indigo-50 dark:bg-indigo-900/20'
                        }`}>
                        {tip.icon}
                    </div>

                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                            {tip.title}
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {currentIndex + 1} / {tips.length}
                            </span>
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {tip.message}
                        </p>
                    </div>

                    {tip.actionLink && (
                        <button
                            onClick={() => navigate(tip.actionLink)}
                            className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 self-end md:self-center"
                        >
                            {tip.actionLabel} <ChevronRight size={14} />
                        </button>
                    )}
                </div>

                {/* Right Arrow */}
                {tips.length > 1 && (
                    <button onClick={nextTip} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>

            {/* Progress Dots (If multiple) */}
            {tips.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {tips.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-indigo-500 w-3' : 'bg-slate-300 dark:bg-slate-600'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
