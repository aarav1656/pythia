'use client'

import { useState, useEffect } from 'react'

// Demo mode - controlled by env var and localStorage toggle
// By default, no demo data is shown

const DEFAULT_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export function useDemoMode() {
    const [isDemoMode, setIsDemoMode] = useState(DEFAULT_DEMO_MODE)
    const [hasInitialized, setHasInitialized] = useState(false)

    useEffect(() => {
        // Check localStorage on mount
        const stored = localStorage.getItem('pythia_demo_mode')
        if (stored !== null) {
            setIsDemoMode(stored === 'true')
        }
        setHasInitialized(true)
    }, [])

    const toggleDemoMode = (enabled: boolean) => {
        setIsDemoMode(enabled)
        localStorage.setItem('pythia_demo_mode', enabled.toString())
    }

    return { isDemoMode, toggleDemoMode, hasInitialized }
}

// Check if demo mode is enabled (for server-side/initial render)
export function isDemoModeEnabled(): boolean {
    if (typeof window === 'undefined') return DEFAULT_DEMO_MODE
    const stored = localStorage.getItem('pythia_demo_mode')
    if (stored !== null) return stored === 'true'
    return DEFAULT_DEMO_MODE
}
