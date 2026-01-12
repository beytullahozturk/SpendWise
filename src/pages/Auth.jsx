import { useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [isReset, setIsReset] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(userCredential.user);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">SpendWise</h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
                    {isReset ? 'Şifrenizi sıfırlayın' : 'Kişisel finans yönetiminizi basitleştirin.'}
                </p>

                {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                {message && <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg mb-4 text-sm">{message}</div>}

                {isReset ? (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-posta</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                        >
                            Sıfırlama Bağlantısı Gönder
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsReset(false); setError(''); setMessage(''); }}
                            className="w-full text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                        >
                            Giriş'e Dön
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-posta</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Şifre</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {isLogin && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => { setIsReset(true); setError(''); setMessage(''); }}
                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                                >
                                    Şifremi Unuttum?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                        >
                            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                        </button>
                    </form>
                )}

                {!isReset && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                        >
                            {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
