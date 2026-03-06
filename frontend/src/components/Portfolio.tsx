'use client'

import { useState, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { formatAddress } from './useMiniKit'
import { Trophy, TrendingUp, TrendingDown, Share2, Wallet, ExternalLink } from 'lucide-react'

interface LeaderboardEntry {
    rank: number
    address: string
    totalProfit: number
    totalBets: number
    winRate: number
}

interface BetPosition {
    marketId: number
    question: string
    side: 'yes' | 'no'
    amount: number
    potentialPayout: number
    currentOdds: number
    resolved: boolean
    won: boolean | null
}

// Mock leaderboard data (in production, fetch from indexer)
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, address: '0x742d...9a21', totalProfit: 2.45, totalBets: 23, winRate: 78 },
    { rank: 2, address: '0x1a2b...3c4d', totalProfit: 1.89, totalBets: 18, winRate: 72 },
    { rank: 3, address: '0x9f8e...2d1c', totalProfit: 1.34, totalBets: 15, winRate: 67 },
    { rank: 4, address: '0x5a6b...7c8d', totalProfit: 0.98, totalBets: 12, winRate: 65 },
    { rank: 5, address: '0x3e4f...5a6b', totalProfit: 0.67, totalBets: 9, winRate: 62 },
]

// Mock portfolio (in production, read from contract)
const MOCK_PORTFOLIO: BetPosition[] = [
    { marketId: 1, question: 'Will BTC reach $150K by end of 2026?', side: 'yes', amount: 0.05, potentialPayout: 0.12, currentOdds: 68, resolved: false, won: null },
    { marketId: 4, question: 'Will there be a Fed rate cut in Q1 2026?', side: 'no', amount: 0.05, potentialPayout: 0.08, currentOdds: 42, resolved: false, won: null },
]

export function Portfolio() {
    const [activeTab, setActiveTab] = useState<'portfolio' | 'leaderboard'>('portfolio')
    const [portfolio] = useState<BetPosition[]>(MOCK_PORTFOLIO)
    const [leaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD)
    const [userAddress, setUserAddress] = useState<string | null>(null)

    useEffect(() => {
        if (MiniKit.isInstalled()) {
            const addr = MiniKit.user.address
            setUserAddress(addr ?? null)
        }
    }, [])

    const totalValue = portfolio.reduce((sum, bet => sum + bet.amount, 0)
    const totalPotential = portfolio.reduce((sum, bet => sum + bet.potentialPayout, 0)

    const shareToX = async (bet: BetPosition) => {
        const text = `I just bet ${bet.amount} ETH on "${bet.question}" on Pythia! 🧙‍♂️\n\nSwipe right for YES, left for NO 👉\n\n#PredictionMarket #Web3 #Chainlink`
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    return (
        <div className="glass-card p-4 mt-4">
            {/* Tab Selector */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'portfolio' 
                            ? 'bg-[var(--accent-purple)] text-white' 
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                >
                    <Wallet size={14} className="inline mr-2" />
                    Portfolio
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'leaderboard' 
                            ? 'bg-[var(--accent-purple)] text-white' 
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                >
                    <Trophy size={14} className="inline mr-2" />
                    Leaderboard
                </button>
            </div>

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
                <div>
                    {/* Summary */}
                    <div className="flex gap-3 mb-4">
                        <div className="flex-1 p-3 rounded-xl bg-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase">Staked</p>
                            <p className="text-lg font-bold text-white">{totalValue.toFixed(3)} ETH</p>
                        </div>
                        <div className="flex-1 p-3 rounded-xl bg-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase">Potential</p>
                            <p className="text-lg font-bold text-[var(--accent-yes)]">{totalPotential.toFixed(3)} ETH</p>
                        </div>
                    </div>

                    {/* Positions */}
                    {portfolio.length === 0 ? (
                        <p className="text-center text-zinc-500 text-sm py-4">No active bets</p>
                    ) : (
                        <div className="space-y-2">
                            {portfolio.map((bet, i) => (
                                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <p className="text-xs text-white line-clamp-2">{bet.question}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                    bet.side === 'yes' 
                                                        ? 'bg-[var(--accent-yes)]/15 text-[var(--accent-yes)]' 
                                                        : 'bg-[var(--accent-no)]/15 text-[var(--accent-no)]'
                                                }`}>
                                                    {bet.side.toUpperCase()}
                                                </span>
                                                <span className="text-[10px] text-zinc-500">{bet.amount} ETH</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => shareToX(bet)}
                                            className="p-2 rounded-lg bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 transition-colors"
                                        >
                                            <Share2 size={14} className="text-[#1DA1F2]" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-zinc-500">Odds: {bet.currentOdds}%</span>
                                        <span className="text-[var(--accent-yes)]">→ {bet.potentialPayout.toFixed(4)} ETH</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
                <div>
                    {/* Current User */}
                    {userAddress && (
                        <div className="p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 mb-4">
                            <p className="text-[10px] text-[var(--accent-purple)] uppercase mb-1">Your Rank</p>
                            <p className="text-2xl font-bold text-white">#12</p>
                            <p className="text-xs text-zinc-400">{formatAddress(userAddress)}</p>
                        </div>
                    )}

                    {/* Top Traders */}
                    <div className="space-y-2">
                        {leaderboard.map((entry) => (
                            <div 
                                key={entry.rank} 
                                className={`flex items-center gap-3 p-3 rounded-xl ${
                                    entry.rank <= 3 ? 'bg-gradient-to-r from-[var(--accent-purple)]/10 to-transparent' : 'bg-white/[0.03]'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                    entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                                    entry.rank === 3 ? 'bg-amber-700/20 text-amber-600' :
                                    'bg-white/5 text-zinc-400'
                                }`}>
                                    {entry.rank <= 3 ? '🏆' : `#${entry.rank}`}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white font-medium">{entry.address}</p>
                                    <p className="text-[10px] text-zinc-500">{entry.totalBets} bets • {entry.winRate}% win rate</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[var(--accent-yes)]">+{entry.totalProfit} ETH</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
