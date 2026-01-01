import { useState } from 'react';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, RefreshCw, LogOut } from 'lucide-react';

export default function VerifyEmailPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleResend = async () => {
        setLoading(true);
        setMessage('');
        try {
            await sendEmailVerification(auth.currentUser);
            setMessage('Doğrulama bağlantısı tekrar gönderildi. Lütfen e-posta kutunuzu (ve spam klasörünü) kontrol edin.');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/too-many-requests') {
                setMessage('Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.');
            } else {
                setMessage('E-posta gönderilemedi: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                    <Mail size={32} />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">E-posta Doğrulama</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Devam etmek için lütfen <strong>{auth.currentUser?.email}</strong> adresine gönderilen doğrulama bağlantısına tıklayın.
                </p>

                {message && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-sm mb-6">
                        {message}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleReload}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} />
                        Kullandım, sayfayı yenile
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={loading}
                        className="w-full py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        {loading ? 'Gönderiliyor...' : 'Bağlantıyı Tekrar Gönder'}
                    </button>

                    <button
                        onClick={() => signOut(auth)}
                        className="text-slate-400 hover:text-red-500 text-sm mt-4 flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                        <LogOut size={14} /> Farklı bir hesapla giriş yap
                    </button>
                </div>
            </div>
        </div>
    );
}
