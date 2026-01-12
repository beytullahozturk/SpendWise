import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Palette, Tag, Shield, Save, Plus, Trash2, Moon, Sun, Monitor, Lock, CreditCard, Bell, TrendingUp, Calendar, UserCircle } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const DEFAULT_EXPENSE_CATEGORIES = [
    'Market', 'Ulaşım', 'Konut', 'Fatura', 'Eğlence', 'Sağlık', 'Eğitim', 'Giyim', 'Diğer'
];

const DEFAULT_INCOME_CATEGORIES = [
    'Maaş', 'Freelance', 'Yatırım', 'Ek Gelir', 'Diğer'
];

export default function SettingsPage({ user }) {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'cards');
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
        incomeCategories: DEFAULT_INCOME_CATEGORIES,
        creditCards: [], // Yeni: Kredi Kartları
        theme: 'system',
        currency: 'TRY',
        fiscalStartDay: 1, // Yeni: Mali Ay Başlangıcı
        defaultPaymentMethod: 'cash', // Yeni: Varsayılan Ödeme Yöntemi
        enableBudgetAlerts: true, // Yeni: Bütçe uyarıları
        enableSubscriptionAlerts: true // Yeni: Abonelik uyarıları
    });

    // Profil State
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoURL, setPhotoURL] = useState(user.photoURL || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Kategori & Kart State
    const [newCategory, setNewCategory] = useState('');
    const [categoryType, setCategoryType] = useState('expense');
    const [newCard, setNewCard] = useState(''); // Yeni Kart İsmi

    // Şifre Değiştirme State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Ayarları Çekme
    useEffect(() => {
        const fetchSettings = async () => {
            const docRef = doc(db, 'user_settings', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setSettings({
                    ...data,
                    creditCards: data.creditCards || [] // Geriye dönük uyumluluk
                });
                if (data.photoURL) setPhotoURL(data.photoURL);
            } else {
                await setDoc(docRef, settings);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [user.uid]);

    // Tema Değişikliği
    const handleThemeChange = async (theme) => {
        const newSettings = { ...settings, theme };
        setSettings(newSettings);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.removeItem('theme');
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        await updateDoc(doc(db, 'user_settings', user.uid), { theme });
    };

    // Kategori Ekleme
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        const targetList = categoryType === 'expense' ? settings.expenseCategories : settings.incomeCategories;
        if (targetList.includes(newCategory.trim())) {
            alert('Bu kategori zaten mevcut.');
            return;
        }

        const updatedList = [...targetList, newCategory.trim()];
        const updateData = categoryType === 'expense'
            ? { expenseCategories: updatedList }
            : { incomeCategories: updatedList };

        setSettings({ ...settings, ...updateData });
        await updateDoc(doc(db, 'user_settings', user.uid), updateData);
        setNewCategory('');
    };

    // Kart Ekleme
    const handleAddCard = async (e) => {
        e.preventDefault();
        if (!newCard.trim()) return;

        const currentCards = settings.creditCards || [];
        if (currentCards.includes(newCard.trim())) {
            alert('Bu kart zaten ekli.');
            return;
        }

        const updatedList = [...currentCards, newCard.trim()];
        const updateData = { creditCards: updatedList };

        setSettings({ ...settings, ...updateData });
        await updateDoc(doc(db, 'user_settings', user.uid), updateData);
        setNewCard('');
    };

    // Kategori/Kart Silme (Birleştirilmiş Mantık)
    const handleDeleteItem = async (item, type) => {
        if (!confirm(`${item} ögesini silmek istediğinize emin misiniz?`)) return;

        let updateData = {};
        if (type === 'card') {
            const updatedList = (settings.creditCards || []).filter(c => c !== item);
            updateData = { creditCards: updatedList };
        } else {
            const targetList = type === 'expense' ? settings.expenseCategories : settings.incomeCategories;
            const updatedList = targetList.filter(c => c !== item);
            updateData = type === 'expense' ? { expenseCategories: updatedList } : { incomeCategories: updatedList };
        }

        setSettings({ ...settings, ...updateData });
        await updateDoc(doc(db, 'user_settings', user.uid), updateData);
    };

    // Profil Güncelleme
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await updateProfile(user, { displayName, photoURL });
            // Firestore 'user_settings' updates optional but good for syncing if needed elsewhere
            await updateDoc(doc(db, 'user_settings', user.uid), { displayName, photoURL });
            alert('Profil güncellendi!');
        } catch (error) {
            console.error(error);
            alert('Hata oluştu.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Şifre Güncelleme
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('Yeni şifreler eşleşmiyor.');
            return;
        }

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            alert('Şifre başarıyla değiştirildi.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            alert('Şifre değiştirilemedi. Mevcut şifrenizi doğru girdiğinizden emin olun.');
        }
    };

    const tabs = [
        { id: 'cards', label: 'Kartlarım', icon: CreditCard },
        { id: 'categories', label: 'Kategoriler', icon: Tag },
        { id: 'preferences', label: 'Görünüm', icon: Palette },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Güvenlik', icon: Shield },
    ];

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Ayarlar</h2>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden sticky top-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 p-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-600'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-l-4 border-transparent'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 min-h-[400px]">

                        {/* 0. KART YÖNETİMİ (YENİ) */}
                        {activeTab === 'cards' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        <CreditCard className="text-indigo-600" size={20} />
                                        Kartlarım
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">Kullandığınız kredi kartlarını ekleyin. Harcama yaparken bu kartlardan seçim yapabileceksiniz.</p>

                                    {/* Add New Card */}
                                    <form onSubmit={handleAddCard} className="flex gap-2 mb-6">
                                        <input
                                            type="text"
                                            value={newCard}
                                            onChange={(e) => setNewCard(e.target.value)}
                                            placeholder="Kart adı (Örn: Bonus, Maximum)"
                                            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                                            <Plus size={24} />
                                        </button>
                                    </form>

                                    {/* List */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(settings.creditCards || []).map((card, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-br from-slate-800 to-slate-700 text-white rounded-xl shadow-md group">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard size={20} className="text-white/80" />
                                                    <span className="font-medium">{card}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteItem(card, 'card')}
                                                    className="p-1.5 text-white/50 hover:text-red-300 hover:bg-white/10 rounded-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {(settings.creditCards || []).length === 0 && (
                                            <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                <p className="mb-2">Henüz kart eklemediniz.</p>
                                                <p className="text-xs">Yukarıdan kartınızın adını yazıp (+) butonuna basın.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1. KATEGORİ YÖNETİMİ */}
                        {activeTab === 'categories' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        <Tag className="text-indigo-600" size={20} />
                                        Kategori Yönetimi
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-6">Gelir ve gider işlemlerinizde kullanacağınız kategorileri özelleştirin.</p>

                                    {/* Tab Switcher for Expense/Income */}
                                    <div className="flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl mb-6">
                                        <button
                                            onClick={() => setCategoryType('expense')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${categoryType === 'expense' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            Gider Kategorileri
                                        </button>
                                        <button
                                            onClick={() => setCategoryType('income')}
                                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${categoryType === 'income' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                                        >
                                            Gelir Kategorileri
                                        </button>
                                    </div>

                                    {/* Add New */}
                                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            placeholder="Yeni kategori adı..."
                                            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                                            <Plus size={24} />
                                        </button>
                                    </form>

                                    {/* List */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(categoryType === 'expense' ? settings.expenseCategories : settings.incomeCategories).map((cat, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{cat}</span>
                                                <button
                                                    onClick={() => handleDeleteItem(cat, categoryType)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. GÖRÜNÜM & TERCİHLER */}
                        {activeTab === 'preferences' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        <Palette className="text-indigo-600" size={20} />
                                        Görünüm & Uygulama Tercihleri
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Tema Ayarları */}
                                        <div className="pb-6 border-b border-slate-100 dark:border-slate-700">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema Seçimi</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                <button
                                                    onClick={() => handleThemeChange('light')}
                                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settings.theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                >
                                                    <Sun size={24} />
                                                    <span className="text-sm font-medium">Açık</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('dark')}
                                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settings.theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                >
                                                    <Moon size={24} />
                                                    <span className="text-sm font-medium">Koyu</span>
                                                </button>
                                                <button
                                                    onClick={() => handleThemeChange('system')}
                                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settings.theme === 'system' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                >
                                                    <Monitor size={24} />
                                                    <span className="text-sm font-medium">Sistem</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Genel Uygulama Ayarları */}
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Para Birimi</label>
                                                <select
                                                    value={settings.currency}
                                                    onChange={(e) => {
                                                        const newCurrency = e.target.value;
                                                        setSettings({ ...settings, currency: newCurrency });
                                                        updateDoc(doc(db, 'user_settings', user.uid), { currency: newCurrency });
                                                    }}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="TRY">Türk Lirası (₺)</option>
                                                    <option value="USD">Amerikan Doları ($)</option>
                                                    <option value="EUR">Euro (€)</option>
                                                    <option value="GBP">İngiliz Sterlini (£)</option>
                                                </select>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tüm finansal verileriniz bu birimde gösterilir.</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Varsayılan Ödeme Yöntemi</label>
                                                <select
                                                    value={settings.defaultPaymentMethod || 'cash'}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setSettings({ ...settings, defaultPaymentMethod: newVal });
                                                        updateDoc(doc(db, 'user_settings', user.uid), { defaultPaymentMethod: newVal });
                                                    }}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="cash">Nakit</option>
                                                    <option value="credit_card">Kredi Kartı</option>
                                                </select>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Yeni harcama eklerken otomatik seçilecek yöntem.</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mali Ay Başlangıcı</label>
                                                <select
                                                    value={settings.fiscalStartDay || 1}
                                                    onChange={(e) => {
                                                        const newVal = parseInt(e.target.value);
                                                        setSettings({ ...settings, fiscalStartDay: newVal });
                                                        updateDoc(doc(db, 'user_settings', user.uid), { fiscalStartDay: newVal });
                                                    }}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    {[...Array(31)].map((_, i) => (
                                                        <option key={i + 1} value={i + 1}>{i + 1}. Gün</option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bütçe ve raporlarınızın döngüsü bu günde başlar.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. BİLDİRİM AYARLARI */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <Bell className="text-indigo-600" size={20} />
                                    Bildirim Tercihleri
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">Hangi durumlarda uyarı almak istediğinizi buradan yönetebilirsiniz.</p>

                                <div className="space-y-4">
                                    {/* Budget Alerts */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Bütçe Aşım Uyarıları</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Belirlediğiniz kategori limitini aştığınızda bildirim alın.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.enableBudgetAlerts ?? true}
                                                onChange={async (e) => {
                                                    const newVal = e.target.checked;
                                                    setSettings({ ...settings, enableBudgetAlerts: newVal });
                                                    await updateDoc(doc(db, 'user_settings', user.uid), { enableBudgetAlerts: newVal });
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {/* Subscription Alerts */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Abonelik Hatırlatıcıları</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Yaklaşan sabit ödemeleriniz için hatırlatma alın.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.enableSubscriptionAlerts ?? true}
                                                onChange={async (e) => {
                                                    const newVal = e.target.checked;
                                                    setSettings({ ...settings, enableSubscriptionAlerts: newVal });
                                                    await updateDoc(doc(db, 'user_settings', user.uid), { enableSubscriptionAlerts: newVal });
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. PROFİL AYARLARI */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <User className="text-indigo-600" size={20} />
                                    Profil Bilgileri
                                </h3>
                                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                                    <div>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-indigo-100 dark:border-indigo-900">
                                                {photoURL ? (
                                                    <img src={photoURL} alt="Profil" className="w-full h-full object-cover" onError={(e) => { e.target.src = '' }} />
                                                ) : (
                                                    <UserCircle size={48} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">Profil Fotoğrafı</p>
                                                <p className="text-xs text-slate-500">Bir resim URL'si girerek profil fotoğrafınızı güncelleyin.</p>
                                            </div>
                                        </div>

                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profil Resmi URL</label>
                                        <input
                                            type="url"
                                            value={photoURL}
                                            onChange={(e) => setPhotoURL(e.target.value)}
                                            placeholder="https://example.com/my-photo.jpg"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                                        />

                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-posta Adresi</label>
                                        <input
                                            type="email"
                                            disabled
                                            value={user.email}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Görünen İsim</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="İsminiz"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18} /> {isSavingProfile ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* 4. GÜVENLİK */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <Shield className="text-indigo-600" size={20} />
                                    Güvenlik
                                </h3>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
                                    <div className="flex gap-3">
                                        <Lock className="text-amber-600 dark:text-amber-400 shrink-0" size={24} />
                                        <div>
                                            <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Şifre Değiştirme</h4>
                                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi öneririz.</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mevcut Şifre</label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yeni Şifre</label>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Yeni Şifre (Tekrar)</label>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18} /> Şifreyi Güncelle
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
