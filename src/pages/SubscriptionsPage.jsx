import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Zap, Plus, Trash2, Calendar, CreditCard, CheckCircle, AlertCircle, Edit2, Play, Pause } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

// Predefined subscription services with clearer colors and icons
const POPULAR_SUBSCRIPTIONS = [
    { id: 'netflix', name: 'Netflix', color: '#E50914', icon: 'N' },
    { id: 'spotify', name: 'Spotify', color: '#1DB954', icon: 'S' },
    { id: 'youtube', name: 'YouTube Premium', color: '#FF0000', icon: 'Y' },
    { id: 'amazon', name: 'Amazon Prime', color: '#00A8E1', icon: 'A' },
    { id: 'icloud', name: 'Apple iCloud', color: '#0070c9', icon: 'A' },
    { id: 'disney', name: 'Disney+', color: '#113CCF', icon: 'D' },
    { id: 'xbox', name: 'Xbox Game Pass', color: '#107C10', icon: 'X' },
    { id: 'playstation', name: 'PlayStation Plus', color: '#00439C', icon: 'P' },
    { id: 'exxen', name: 'Exxen', color: '#FFD600', icon: 'E' },
    { id: 'blutv', name: 'BluTV', color: '#1FBAD6', icon: 'B' },
    { id: 'custom', name: 'Diğer', color: '#6366f1', icon: '?' }
];

export default function SubscriptionsPage({ user }) {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, sub: null });

    // Form State
    const [formData, setFormData] = useState({
        serviceId: 'custom',
        name: '',
        price: '',
        billingDay: '1', // Day of the month (1-31)
        cycle: 'monthly', // monthly, yearly
        status: 'active'
    });

    useEffect(() => {
        const q = query(collection(db, 'subscriptions'), where('uid', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubscriptions(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleSave = async (e) => {
        e.preventDefault();

        // Auto-fill name/color if reliable service is picked
        let finalName = formData.name;
        let finalColor = formData.color;

        if (formData.serviceId !== 'custom') {
            const service = POPULAR_SUBSCRIPTIONS.find(s => s.id === formData.serviceId);
            if (service) {
                finalName = finalName || service.name;
                finalColor = service.color;
            }
        } else {
            finalColor = '#6366f1'; // Default Indigo
        }

        const subData = {
            uid: user.uid,
            serviceId: formData.serviceId,
            name: finalName,
            price: parseFloat(formData.price),
            billingDay: parseInt(formData.billingDay),
            cycle: formData.cycle,
            status: formData.status,
            color: finalColor,
            updatedAt: serverTimestamp()
        };

        if (formData.id) {
            await setDoc(doc(db, 'subscriptions', formData.id), subData, { merge: true });
        } else {
            await setDoc(doc(collection(db, 'subscriptions')), subData);
        }

        setIsModalOpen(false);
        resetForm();
    };

    const handleDelete = async (id) => {
        if (confirm('Bu abonelik kaydını silmek istiyor musunuz?')) {
            await deleteDoc(doc(db, 'subscriptions', id));
        }
    };

    const resetForm = () => {
        setFormData({
            serviceId: 'custom',
            name: '',
            price: '',
            billingDay: '1',
            cycle: 'monthly',
            status: 'active'
        });
    };

    const openEdit = (sub) => {
        setFormData({ ...sub });
        setIsModalOpen(true);
    };

    const handlePayClick = async (sub) => {
        // Mükerrer ödeme kontrolü
        try {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const titleToCheck = `${sub.name} Aboneliği`;

            const q = query(
                collection(db, 'transactions'),
                where('uid', '==', user.uid),
                where('title', '==', titleToCheck)
            );

            const snapshot = await getDocs(q);
            const alreadyPaid = snapshot.docs.some(doc => {
                const data = doc.data();
                return data.date && data.date.startsWith(currentMonth);
            });

            if (alreadyPaid) {
                alert(`"${sub.name}" için bu ay zaten bir harcama kaydı bulunuyor.`);
                return;
            }

            setConfirmModal({ isOpen: true, sub });
        } catch (error) {
            console.error("Ödeme kontrolü hatası:", error);
            alert("Bir hata oluştu, lütfen tekrar deneyin.");
        }
    };

    const handleExecutePayment = async () => {
        const sub = confirmModal.sub;
        if (!sub) return;

        try {
            await addDoc(collection(db, 'transactions'), {
                uid: user.uid,
                title: `${sub.name} Aboneliği`,
                amount: sub.price,
                type: 'expense',
                category: 'Fatura',
                paymentMethod: 'credit_card',
                date: new Date().toISOString().split('T')[0],
                subscriptionId: sub.id, // ID referansı
                createdAt: serverTimestamp()
            });
            alert('Harcama başarıyla eklendi!');
        } catch (error) {
            console.error(error);
            alert('Hata oluştu.');
        }
    };

    // Stats
    const totalMonthly = subscriptions
        .filter(s => s.status === 'active')
        .reduce((acc, sub) => {
            let monthlyPrice = sub.price;
            if (sub.cycle === 'yearly') monthlyPrice = sub.price / 12;
            return acc + monthlyPrice;
        }, 0);

    const activeCount = subscriptions.filter(s => s.status === 'active').length;

    // Helper to calc next billing date
    const getNextBillingDate = (day) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        let billingDate = new Date(currentYear, currentMonth, day);

        // If billing day has passed this month, move to next
        if (today.getDate() > day) {
            billingDate.setMonth(currentMonth + 1);
        }

        return billingDate;
    };

    // Sort by next billing date (nearest)
    const sortedSubscriptions = [...subscriptions].sort((a, b) => {
        const dateA = getNextBillingDate(a.billingDay);
        const dateB = getNextBillingDate(b.billingDay);
        return dateA - dateB;
    });

    return (
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Zap className="text-indigo-600 dark:text-indigo-400" />
                        Abonelikler
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sabit ödemelerinizi ve dijital servis üyeliklerinizi yönetin.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-indigo-500/30"
                >
                    <Plus size={18} />
                    Yeni Abonelik
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={80} />
                    </div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">Aylık Toplam Sabit Gider</p>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {totalMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </h2>
                    <p className="text-indigo-200 text-xs mt-2 opacity-80">*Yıllık paketler aylık ortalamaya dahil edilmiştir.</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aktif Abonelikler</p>
                        <CheckCircle className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        {activeCount} <span className="text-base font-normal text-slate-400">Servis</span>
                    </h2>
                </div>
            </div>

            {/* Subscriptions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedSubscriptions.map(sub => {
                    const nextDate = getNextBillingDate(sub.billingDay);
                    const daysLeft = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 3;

                    return (
                        <div key={sub.id} className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all hover:shadow-md relative overflow-hidden group ${sub.status === 'inactive' ? 'opacity-60 border-slate-200 dark:border-slate-700' : isUrgent ? 'border-amber-200 dark:border-amber-800' : 'border-slate-100 dark:border-slate-700'}`}>
                            {sub.status === 'active' && daysLeft <= 7 && (
                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl ${isUrgent ? 'bg-amber-500' : 'bg-slate-400'}`}>
                                    {daysLeft === 0 ? 'BUGÜN' : `${daysLeft} GÜN KALDI`}
                                </div>
                            )}

                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
                                            style={{ backgroundColor: sub.color || '#6366f1' }}
                                        >
                                            {sub.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{sub.name}</h3>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{sub.billingDay}. Gün / {sub.cycle === 'monthly' ? 'Aylık' : 'Yıllık'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePayClick(sub)}
                                            className="text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            title="Ödemeyi Harcama Olarak Ekle"
                                        >
                                            <CreditCard size={18} />
                                        </button>
                                        <button
                                            onClick={() => openEdit(sub)}
                                            className="text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                            {sub.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                            <Calendar size={12} />
                                            Sonraki: {nextDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>

                                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        {sub.status === 'active' ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
                                        {sub.status === 'active' ? 'Aktif' : 'Pasif'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={formData.id ? 'Aboneliği Düzenle' : 'Yeni Abonelik Ekle'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {/* Presets */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                        {POPULAR_SUBSCRIPTIONS.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, serviceId: s.id, name: s.id === 'custom' ? '' : s.name })}
                                className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${formData.serviceId === s.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold`} style={{ backgroundColor: s.color }}>
                                    {s.icon}
                                </span>
                                <span className="truncate w-full text-center">{s.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {formData.serviceId === 'custom' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Servis Adı</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Örn: Ev Kirası, İnternet..."
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tutar (TL)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ödeme Günü</label>
                            <select
                                value={formData.billingDay}
                                onChange={(e) => setFormData({ ...formData, billingDay: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Her ayın {day}. günü</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Döngü</label>
                            <select
                                value={formData.cycle}
                                onChange={(e) => setFormData({ ...formData, cycle: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="monthly">Aylık</option>
                                <option value="yearly">Yıllık</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Durum</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="active">Aktif</option>
                                <option value="inactive">Pasif / İptal</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3">
                        {formData.id && (
                            <button
                                type="button"
                                onClick={() => handleDelete(formData.id)}
                                className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all"
                        >
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleExecutePayment}
                title="Abonelik Ödemesi"
                message={`"${confirmModal.sub?.name}" için ${confirmModal.sub?.price} TL tutarında harcama eklemek istiyor musunuz?`}
                type="info"
            />
        </div >
    );
}
