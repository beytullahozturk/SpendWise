import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import BudgetPage from './pages/BudgetPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import Navigation from './components/Navigation';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Yükleniyor...</div>;

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-300">
                {!user ? (
                    <Auth />
                ) : (
                    <>
                        <Navigation />
                        <main className="lg:ml-64 min-h-screen">
                            <Routes>
                                <Route path="/" element={<Dashboard user={user} />} />
                                <Route path="/calendar" element={<CalendarPage user={user} />} />
                                <Route path="/budget" element={<BudgetPage user={user} />} />
                                <Route path="/reports" element={<ReportsPage user={user} />} />
                                <Route path="/settings" element={<SettingsPage user={user} />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </main>
                    </>
                )}
            </div>
        </BrowserRouter>
    );
}

export default App;
