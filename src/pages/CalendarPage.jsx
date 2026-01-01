import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, CheckCircle, Circle, Calendar as CalIcon, AlertCircle, CreditCard, Banknote } from 'lucide-react';
import '../Calendar.css';

const EXPENSE_CATEGORIES = [
    'Market', 'Ulaşım', 'Konut', 'Fatura', 'Eğlence', 'Sağlık', 'Eğitim', 'Giyim', 'Diğer'
];

export default function CalendarPage({ user }) {
    const [date, setDate] = useState(new Date());
    const [plannedTxns, setPlannedTxns] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    // Recurrence states
    const [recurrence, setRecurrence] = useState('none'); // none, weekly, monthly
    const [recurrenceCount, setRecurrenceCount] = useState(12);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'credit_card'

    // Fetch planned transactions
    useEffect(() => {
        const q = query(
            collection(db, 'planned_transactions'),
            where('uid', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlannedTxns(data);
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Fetch active subscriptions
    useEffect(() => {
        const q = query(
            collection(db, 'subscriptions'),
            where('uid', '==', user.uid),
            where('status', '==', 'active')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSubscriptions(data);
        });

        return () => unsubscribe();
    }, [user.uid]);

    // Helper to check if a day has events
    const getTileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = date.toISOString().split('T')[0];
            const events = plannedTxns.filter(t => t.date === dateStr);
            const activeSubs = subscriptions.filter(s => s.billingDay === date.getDate());

            if (events.length > 0 || activeSubs.length > 0) {
                return (
                    <div className="calendar-tile-content flex items-center justify-center gap-0.5">
                        {events.map((evt, i) => (
                            <div
                                key={`evt-${i}`}
                                className={`calendar-dot ${evt.isCompleted ? 'dot-completed' : 'dot-expense'}`}
                            />
                        ))}
                        {activeSubs.map((sub, i) => (
                            <div
                                key={`sub-${i}`}
                                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                                title={sub.name}
                            />
                        ))}
                    </div>
                );
            }
        }
    };

    const handleAddPlanned = async (e) => {
        e.preventDefault();
        if (!amount || !title || !category) return;
        setIsSubmitting(true);

        try {
            const baseDate = new Date(date);
            const count = recurrence === 'none' ? 1 : parseInt(recurrenceCount);

            const promises = [];

            for (let i = 0; i < count; i++) {
                const newDate = new Date(baseDate);

                if (recurrence === 'weekly') {
                    newDate.setDate(baseDate.getDate() + (i * 7));
                } else if (recurrence === 'monthly') {
                    newDate.setMonth(baseDate.getMonth() + i);
                }

                const dateStr = newDate.toISOString().split('T')[0];

                promises.push(addDoc(collection(db, 'planned_transactions'), {
                    uid: user.uid,
                    title: recurrence !== 'none' ? `${title} (${i + 1}/${count})` : title,
                    amount: parseFloat(amount),
                    category,
                    paymentMethod,
                    date: dateStr,
                    isCompleted: false,
                    createdAt: serverTimestamp()
                }));
            }

            await Promise.all(promises);

            setAmount('');
            setTitle('');
            setCategory('');
            setRecurrence('none');
        } catch (error) {
            console.error("Error adding planned transaction:", error);
            alert("Bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async (txn) => {
        if (!confirm(`${txn.title} işlemini tamamlandı olarak işaretlemek istiyor musunuz?`)) return;

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

        await updateDoc(doc(db, 'planned_transactions', txn.id), {
            isCompleted: true
        });
    };

    const handleDelete = async (id) => {
        if (confirm('Bu planlı işlemi silmek istediğinize emin misiniz?')) {
            await deleteDoc(doc(db, 'planned_transactions', id));
        }
    };

    // Filter events for selected date
    const selectedDateStr = date.toISOString().split('T')[0];
    const eventsForDate = plannedTxns.filter(t => t.date === selectedDateStr);
    const subsForDate = subscriptions.filter(s => s.billingDay === date.getDate());

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                <CalIcon className="text-indigo-600 dark:text-indigo-400" />
                Ödeme Takvimi
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <Calendar
                        onChange={setDate}
                        value={date}
                        tileContent={getTileContent}
                        className="w-full border-none font-sans text-slate-700 dark:text-slate-200"
                        locale="tr-TR"
                    />
                </div>

                {/* Details Side Panel */}
                <div className="space-y-6">
                    {/* Events List */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>

                        {(eventsForDate.length === 0 && subsForDate.length === 0) ? (
                            <p className="text-slate-400 text-sm text-center py-6">Bu tarih için planlanmış bir ödeme yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {/* Subscriptions List */}
                                {subsForDate.map(sub => (
                                    <div key={sub.id} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: sub.color || '#6366f1' }}>
                                                {sub.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{sub.name}</p>
                                                <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded">Abonelik</span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                            {sub.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </span>
                                    </div>
                                ))}

                                {/* Planned Transactions List */}
                                {eventsForDate.map(evt => (
                                    <div key={evt.id} className={`p-3 rounded-xl border flex items-center justify-between group transition-all ${evt.isCompleted ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-700/50 dark:border-slate-600'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${evt.isCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-white text-slate-500 dark:bg-slate-600 dark:text-slate-300'}`}>
                                                {evt.isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                                            </div>
                                            <div>
                                                <p className={`font-semibold text-sm ${evt.isCompleted ? 'text-emerald-800 dark:text-emerald-200 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{evt.title}</p>
                                                <p className="text-xs text-slate-400">{evt.category}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm ${evt.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {evt.amount}₺
                                            </span>
                                            {!evt.isCompleted && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleComplete(evt)} className="p-1.5 text-emerald-500 hover:bg-emerald-100 rounded-md" title="Öde">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(evt.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-md" title="Sil">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-500" />
                            Yeni Plan Ekle
                        </h3>
                        <form onSubmit={handleAddPlanned} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Başlık</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                                    placeholder="Örn: Kira Ödemesi"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Tutar</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Kategori</label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                    >
                                        <option value="">Seçiniz</option>
                                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Ödeme Yöntemi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-transparent'}`}
                                    >
                                        <Banknote size={16} /> Nakit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${paymentMethod === 'credit_card' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-transparent'}`}
                                    >
                                        <CreditCard size={16} /> Kredi Kartı
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Tekrar</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                                    value={recurrence}
                                    onChange={e => setRecurrence(e.target.value)}
                                >
                                    <option value="none">Tek Seferlik</option>
                                    <option value="weekly">Haftalık</option>
                                    <option value="monthly">Aylık</option>
                                </select>
                            </div>

                            {recurrence !== 'none' && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Tekrar Sayısı</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="60"
                                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                                        value={recurrenceCount}
                                        onChange={e => setRecurrenceCount(e.target.value)}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Ekleniyor...' : (
                                    <>
                                        <Plus size={18} />
                                        Plana Ekle
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
