'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Flame, Target, Zap, Award, Lock, Check } from 'lucide-react'

interface Achievement {
    id: string
    name: string
    description: string
    icon: string
    unlocked: boolean
    progress?: number
    maxProgress?: number
    reward: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_bet',
        name: 'First Blood',
        description: 'Place your first bet',
        icon: '🎯',
        unlocked: true,
        reward: '0.01 ETH',
        rarity: 'common',
    },
    {
        id: 'win_streak_3',
        name: 'Hot Streak',
        description: 'Win 3 bets in a row',
        icon: '🔥',
        unlocked: false,
        progress: 1,
        maxProgress: 3,
        reward: '0.05 ETH',
        rarity: 'rare',
    },
    {
        id: 'refer_5',
        name: 'Influencer',
        description: 'Refer 5 friends',
        icon: '👥',
        unlocked: false,
        progress: 3,
        maxProgress: 5,
        reward: '0.1 ETH',
        rarity: 'epic',
    },
    {
        id: 'volume_1eth',
        name: 'High Roller',
        description: 'Bet 1 ETH total',
        icon: '💎',
        unlocked: false,
        progress: 0.45,
        maxProgress: 1,
        reward: '0.15 ETH',
        rarity: 'epic',
    },
    {
        id: 'predict_10',
        name: 'Oracle',
        description: 'Win 10 predictions',
        icon: 'P',
        unlocked: false,
        progress: 7,
        maxProgress: 10,
        reward: '0.25 ETH',
        rarity: 'legendary',
    },
    {
        id: 'create_market',
        name: 'Market Maker',
        description: 'Create your first market',
        icon: '📈',
        unlocked: false,
        reward: '0.05 ETH',
        rarity: 'rare',
    },
    {
        id: 'verified',
        name: 'Verified Human',
        description: 'Complete World ID verification',
        icon: '✓',
        unlocked: true,
        reward: '0.02 ETH',
        rarity: 'common',
    },
    {
        id: 'early_adopter',
        name: 'Early Adopter',
        description: 'Join during hackathon',
        icon: '🚀',
        unlocked: true,
        reward: '0.1 ETH',
        rarity: 'legendary',
    },
]

const RARITY_COLORS = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#8b5cf6',
    legendary: '#f59e0b',
}

export function Achievements() {
    const [achievements] = useState<Achievement[]>(ACHIEVEMENTS)
    const [showAll, setShowAll] = useState(false)
    
    const unlockedCount = achievements.filter(a => a.unlocked).length
    const totalRewards = achievements
        .filter(a => !a.unlocked)
        .reduce((sum, a) => {
            const rewardNum = parseFloat(a.reward)
            return sum + (isNaN(rewardNum) ? 0 : rewardNum)
        }, 0)

    const displayedAchievements = showAll ? achievements : achievements.filter(a => a.unlocked || a.progress)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="solid-card p-4 mt-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-yellow-500" />
                    <h3 className="text-sm font-semibold text-white">Achievements</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{unlockedCount}/{achievements.length}</span>
                    <span className="text-[10px] text-[var(--accent-yes)]">+{totalRewards.toFixed(2)} ETH</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                        className="h-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-yes)]"
                    />
                </div>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-4 gap-2">
                {displayedAchievements.slice(0, 8).map(achievement => (
                    <motion.button
                        key={achievement.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative p-2 rounded-xl border transition-all ${
                            achievement.unlocked
                                ? 'bg-white/[0.05] border-white/10'
                                : 'bg-white/[0.02] border-white/5 opacity-60'
                        }`}
                    >
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mx-auto mb-1"
                            style={{ 
                                backgroundColor: achievement.unlocked 
                                    ? `${RARITY_COLORS[achievement.rarity]}20` 
                                    : 'rgba(255,255,255,0.05)'
                            }}
                        >
                            {achievement.unlocked ? achievement.icon : <Lock size={16} className="text-zinc-600" />}
                        </div>
                        <p className="text-[8px] text-center text-zinc-400 truncate">{achievement.name}</p>
                        
                        {/* Progress indicator */}
                        {achievement.progress !== undefined && achievement.maxProgress && !achievement.unlocked && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[var(--accent-yes)]"
                                    style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                />
                            </div>
                        )}
                        
                        {/* Unlocked checkmark */}
                        {achievement.unlocked && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-yes)] flex items-center justify-center">
                                <Check size={8} className="text-black" />
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Show More */}
            {achievements.length > 8 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors"
                >
                    {showAll ? 'Show less' : `+${achievements.length - 8} more`}
                </button>
            )}
        </motion.div>
    )
}
