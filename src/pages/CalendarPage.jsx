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

    // Helper to check if a day has events
    const getTileContent = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = date.toISOString().split('T')[0];
            const events = plannedTxns.filter(t => t.date === dateStr);

            if (events.length > 0) {
                return (
                    <div className="calendar-tile-content">
                        {events.map((evt, i) => (
                            <div
                                key={i}
                                className={`calendar-dot ${evt.isCompleted ? 'dot-completed' : 'dot-expense'}`}
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
            setPaymentMethod('cash');
            setRecurrence('none');
            setRecurrenceCount(12);
        } catch (error) {
            console.error("Error adding planned txn:", error);
            alert("Bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async (txn) => {
        // 1. Add to actual transactions
        await addDoc(collection(db, 'transactions'), {
            uid: user.uid,
            title: txn.title,
            amount: txn.amount,
            type: 'expense', // Assuming planned are usually expenses
            category: txn.category,
            paymentMethod: txn.paymentMethod || 'cash',
            date: txn.date,
            createdAt: serverTimestamp()
        });

        // 2. Mark as completed or delete? Let's mark as completed to keep history
        await updateDoc(doc(db, 'planned_transactions', txn.id), {
            isCompleted: true
        });
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, 'planned_transactions', id));
    };

    const selectedDateStr = date.toISOString().split('T')[0];
    const selectedDayEvents = plannedTxns.filter(t => t.date === selectedDateStr);

    return (
        <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <CalIcon className="text-indigo-600 dark:text-indigo-400" />
                Planlı Ödemeler & Takvim
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <Calendar
                        onChange={setDate}
                        value={date}
                        tileContent={getTileContent}
                        className="w-full text-sm"
                        locale="tr-TR"
                    />
                </div>

                {/* Day Details & Add Form */}
                <div className="space-y-6">
                    {/* Add Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-sm uppercase tracking-wider">
                            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} İçin Ekle
                        </h3>
                        <form onSubmit={handleAddPlanned} className="space-y-3">
                            <input
                                type="text"
                                placeholder="Başlık (Örn: Kira)"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Tutar"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={category}
                                    required
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">Kategori</option>
                                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all ${paymentMethod === 'cash'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent'
                                        }`}
                                >
                                    <Banknote size={14} /> Nakit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('credit_card')}
                                    className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all ${paymentMethod === 'credit_card'
                                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-transparent'
                                        }`}
                                >
                                    <CreditCard size={14} /> Kredi Kartı
                                </button>
                            </div>

                            {/* Recurrence Options */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Tekrar Seçenekleri</label>
                                <div className="flex gap-2 mb-2">
                                    <select
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs outline-none"
                                        value={recurrence}
                                        onChange={(e) => setRecurrence(e.target.value)}
                                    >
                                        <option value="none">Tekrarlama Yok</option>
                                        <option value="monthly">Her Ay</option>
                                        <option value="weekly">Her Hafta</option>
                                    </select>
                                    {recurrence !== 'none' && (
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={recurrenceCount}
                                            onChange={(e) => setRecurrenceCount(e.target.value)}
                                            className="w-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs outline-none text-center"
                                            title="Kaç kez tekrar etsin?"
                                        />
                                    )}
                                </div>
                                {recurrence !== 'none' && (
                                    <p className="text-[10px] text-indigo-500">
                                        * Bu tarihten başlayarak <strong>{recurrenceCount}</strong> kez otomatik oluşturulacak.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? 'İşleniyor...' : 'Planla'}
                            </button>
                        </form>
                    </div>

                    {/* Selected Day List */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-sm uppercase tracking-wider flex justify-between items-center">
                            <span>Planlananlar</span>
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full">{selectedDayEvents.length}</span>
                        </h3>

                        {selectedDayEvents.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">Planlanmış ödeme yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedDayEvents.map(txn => (
                                    <div key={txn.id} className={`p-3 rounded-xl border ${txn.isCompleted ? 'border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/30' : 'border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-700/30'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className={`font-semibold ${txn.isCompleted ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{txn.title}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                                    <span>{txn.category}</span>
                                                    <span>•</span>
                                                    <span>{txn.amount} TL</span>
                                                    <span>•</span>
                                                    <span className={`flex items-center gap-1 ${txn.paymentMethod === 'credit_card' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {txn.paymentMethod === 'credit_card' ? <CreditCard size={10} /> : <Banknote size={10} />}
                                                        {txn.paymentMethod === 'credit_card' ? 'K.Kartı' : 'Nakit'}
                                                    </span>
                                                </div>
                                            </div>
                                            {!txn.isCompleted && (
                                                <button
                                                    onClick={() => handleComplete(txn)}
                                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 p-1"
                                                    title="Ödendi İşaretle (Harcamalara Ekle)"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleDelete(txn.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors text-xs flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Sil
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
