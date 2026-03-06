'use client'

import { useDemoMode } from '@/hooks/useDemoMode'
import { Eye, EyeOff } from 'lucide-react'

interface DemoModeToggleProps {
    className?: string
}

export function DemoModeToggle({ className = '' }: DemoModeToggleProps) {
    const { isDemoMode, toggleDemoMode, hasInitialized } = useDemoMode()

    if (!hasInitialized) return null

    return (
        <button
            onClick={() => toggleDemoMode(!isDemoMode)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-colors ${
                isDemoMode 
                    ? 'bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/25 text-[var(--accent-purple)]' 
                    : 'bg-white/5 border border-white/8 text-zinc-500 hover:text-zinc-400'
            } ${className}`}
        >
            {isDemoMode ? <Eye size={11} /> : <EyeOff size={11} />}
            <span>{isDemoMode ? 'Demo' : 'Live'}</span>
        </button>
    )
}
