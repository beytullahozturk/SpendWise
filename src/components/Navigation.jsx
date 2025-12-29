import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, PieChart, Wallet, Settings, BarChart2 } from 'lucide-react';

export default function Navigation() {
    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Ana Sayfa' },
        { path: '/calendar', icon: Calendar, label: 'Takvim' },
        { path: '/budget', icon: PieChart, label: 'Bütçe' },
        { path: '/reports', icon: BarChart2, label: 'Raporlar' },
        { path: '/settings', icon: Settings, label: 'Ayarlar' },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 z-50 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                        <Wallet size={24} />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-800 to-indigo-600 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">SpendWise</span>
                </div>

                <div className="space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-300'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 text-center">v1.0.0 • SpendWise</p>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-50 flex justify-around p-2 transition-colors duration-300">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px] ${isActive
                                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                                : 'text-slate-500 dark:text-slate-500'
                            }`
                        }
                    >
                        <item.icon size={24} strokeWidth={item.path === location.pathname ? 2.5 : 2} />
                        <span className="text-[10px]">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
