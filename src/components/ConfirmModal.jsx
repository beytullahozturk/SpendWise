import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'danger' }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-700 p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600'}`}>
                        <AlertTriangle size={32} />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {title}
                    </h3>

                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                                }`}
                        >
                            Onayla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
