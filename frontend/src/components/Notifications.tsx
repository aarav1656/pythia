'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Check, X } from 'lucide-react'

interface NotificationSettings {
    marketResolved: boolean
    newMarket: boolean
    winningBet: boolean
    priceAlerts: boolean
}

interface NotificationBannerProps {
    isEnabled: boolean
    onToggle: (enabled: boolean) => void
}

export function NotificationBanner({ isEnabled, onToggle }: NotificationBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3"
        >
            <div className="flex items-center gap-3">
                {isEnabled ? (
                    <Bell size={18} className="text-[var(--accent-yes)]" />
                ) : (
                    <BellOff size={18} className="text-zinc-500" />
                )}
                <div>
                    <p className="text-sm text-white font-medium">Notifications</p>
                    <p className="text-[10px] text-zinc-500">
                        {isEnabled ? 'You\'ll be notified when markets resolve' : 'Enable to get updates'}
                    </p>
                </div>
            </div>
            <button
                onClick={() => onToggle(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                    isEnabled ? 'bg-[var(--accent-yes)]' : 'bg-white/20'
                }`}
            >
                <motion.div
                    animate={{ x: isEnabled ? 24 : 2 }}
                    className="w-5 h-5 rounded-full bg-white"
                />
            </button>
        </motion.div>
    )
}

// In-app notification toast
interface ToastProps {
    message: string
    type: 'success' | 'info' | 'warning'
    onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000)
        return () => clearTimeout(timer)
    }, [onClose])

    const colors = {
        success: 'bg-[var(--accent-yes)]',
        info: 'bg-[var(--accent-blue)]',
        warning: 'bg-[var(--accent-purple)]',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 ${colors[type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50`}
        >
            {type === 'success' && <Check size={18} className="text-black" />}
            <p className="text-sm font-medium text-black">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-black/10 rounded">
                <X size={14} className="text-black" />
            </button>
        </motion.div>
    )
}
