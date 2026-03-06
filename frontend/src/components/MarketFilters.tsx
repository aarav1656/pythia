'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, TrendingUp, Flame, Clock, Sparkles, X, Hash } from 'lucide-react'

interface MarketFiltersProps {
    onFilterChange: (filters: MarketFilters) => void
}

export interface MarketFilters {
    category: string | null
    status: 'all' | 'active' | 'resolved' | 'endingsoon'
    sortBy: 'newest' | 'popular' | 'endingsoon' | 'volume'
    search: string
}

const CATEGORIES = [
    { id: 'all', name: 'All', icon: '🌐' },
    { id: 'crypto', name: 'Crypto', icon: '₿' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'politics', name: 'Politics', icon: '🏛️' },
    { id: 'weather', name: 'Weather', icon: '🌤️' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
]

const TABS = [
    { id: 'trending', name: 'Trending', icon: TrendingUp },
    { id: 'hot', name: 'Hot', icon: Flame },
    { id: 'new', name: 'New', icon: Sparkles },
    { id: 'ending', name: 'Ending Soon', icon: Clock },
]

export function MarketFilters({ onFilterChange }: MarketFiltersProps) {
    const [filters, setFilters] = useState<MarketFilters>({
        category: null,
        status: 'active',
        sortBy: 'popular',
        search: '',
    })
    const [showSearch, setShowSearch] = useState(false)
    const [activeTab, setActiveTab] = useState('trending')

    const updateFilters = (updates: Partial<MarketFilters>) => {
        const newFilters = { ...filters, ...updates }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
                {showSearch ? (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10"
                    >
                        <Search size={16} className="text-zinc-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => updateFilters({ search: e.target.value })}
                            placeholder="Search markets..."
                            className="flex-1 bg-transparent text-white text-sm placeholder:text-zinc-500 focus:outline-none"
                            autoFocus
                        />
                        <button onClick={() => { setShowSearch(false); updateFilters({ search: '' }) }}>
                            <X size={16} className="text-zinc-400" />
                        </button>
                    </motion.div>
                ) : (
                    <button
                        onClick={() => setShowSearch(true)}
                        className="w-full flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10"
                    >
                        <Search size={16} className="text-zinc-400" />
                        <span className="text-sm text-zinc-400">Search markets...</span>
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-[var(--accent-purple)] text-white'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        <tab.icon size={12} />
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => updateFilters({ category: cat.id === 'all' ? null : cat.id })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all ${
                            (filters.category === cat.id || (cat.id === 'all' && !filters.category))
                                ? 'bg-[var(--accent-purple)] text-white'
                                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                    >
                        <span>{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase">Sort by</span>
                <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                    className="bg-transparent text-xs text-zinc-400 focus:outline-none cursor-pointer"
                >
                    <option value="popular" className="bg-zinc-900">Most Popular</option>
                    <option value="newest" className="bg-zinc-900">Newest</option>
                    <option value="endingsoon" className="bg-zinc-900">Ending Soon</option>
                    <option value="volume" className="bg-zinc-900">Highest Volume</option>
                </select>
            </div>
        </div>
    )
}
