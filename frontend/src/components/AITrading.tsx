'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Zap, Shield, Brain, ChevronRight, Settings, Play, Pause, TrendingUp } from 'lucide-react'

interface Agent {
    id: string
    name: string
    description: string
    icon: string
    active: boolean
    winRate: number
    totalBets: number
    profit: number
}

const AGENTS: Agent[] = [
    {
        id: 'prophet',
        name: 'Prophet AI',
        description: 'Analyzes news & social sentiment to predict outcomes',
        icon: '🔮',
        active: false,
        winRate: 67,
        totalBets: 156,
        profit: 2.34,
    },
    {
        id: 'quant',
        name: 'Quant Bot',
        description: 'Uses on-chain data & market signals',
        icon: '📊',
        active: false,
        winRate: 72,
        totalBets: 89,
        profit: 1.89,
    },
    {
        id: 'sentiment',
        name: 'Sentiment Scanner',
        description: 'Monitors Twitter/X for trend analysis',
        icon: '🐦',
        active: false,
        winRate: 58,
        totalBets: 234,
        profit: 0.45,
    },
    {
        id: 'consensus',
        name: 'Consensus Hunter',
        description: 'Bets against the crowd when overconfident',
        icon: '🎯',
        active: false,
        winRate: 71,
        totalBets: 67,
        profit: 1.12,
    },
]

interface AITradingProps {
    isEnabled: boolean
    onToggle: (enabled: boolean) => void
}

export function AITrading({ isEnabled, onToggle }: AITradingProps) {
    const [agents, setAgents] = useState<Agent[]>(AGENTS)
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

    const toggleAgent = (agentId: string) => {
        setAgents(agents.map(agent => 
            agent.id === agentId 
                ? { ...agent, active: !agent.active }
                : agent
        ))
    }

    const activeAgents = agents.filter(a => a.active)
    const totalProfit = activeAgents.reduce((sum, a) => sum + a.profit, 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mt-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-[var(--accent-purple)]" />
                    <h3 className="text-sm font-semibold text-white">AI Trading Agents</h3>
                </div>
                <button
                    onClick={() => onToggle(!isEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                        isEnabled ? 'bg-[var(--accent-purple)]' : 'bg-white/20'
                    }`}
                >
                    <motion.div
                        animate={{ x: isEnabled ? 24 : 2 }}
                        className="w-5 h-5 rounded-full bg-white"
                    />
                </button>
            </div>

            {isEnabled ? (
                <>
                    {/* Active Stats */}
                    {activeAgents.length > 0 && (
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 p-3 rounded-xl bg-[var(--accent-purple)]/10">
                                <p className="text-[10px] text-[var(--accent-purple)] uppercase">Active Agents</p>
                                <p className="text-lg font-bold text-white">{activeAgents.length}</p>
                            </div>
                            <div className="flex-1 p-3 rounded-xl bg-[var(--accent-yes)]/10">
                                <p className="text-[10px] text-[var(--accent-yes)] uppercase">Profit</p>
                                <p className="text-lg font-bold text-[var(--accent-yes)]">+{totalProfit.toFixed(2)} ETH</p>
                            </div>
                        </div>
                    )}

                    {/* Agent List */}
                    <div className="space-y-2">
                        {agents.map(agent => (
                            <div 
                                key={agent.id}
                                className={`p-3 rounded-xl border transition-all ${
                                    agent.active 
                                        ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/30' 
                                        : 'bg-white/[0.03] border-white/5'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{agent.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-white">{agent.name}</p>
                                            <p className="text-[10px] text-zinc-500">{agent.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleAgent(agent.id)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            agent.active 
                                                ? 'bg-[var(--accent-yes)] text-black' 
                                                : 'bg-white/10 text-zinc-400 hover:bg-white/20'
                                        }`}
                                    >
                                        {agent.active ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                </div>
                                
                                {/* Stats when active */}
                                {agent.active && (
                                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp size={12} className="text-[var(--accent-yes)]" />
                                            <span className="text-[10px] text-zinc-400">{agent.winRate}% win rate</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Bot size={12} className="text-zinc-500" />
                                            <span className="text-[10px] text-zinc-400">{agent.totalBets} bets</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Zap size={12} className="text-[var(--accent-yes)]" />
                                            <span className="text-[10px] text-[var(--accent-yes)]">+{agent.profit} ETH</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-white/5">
                        <Shield size={14} className="text-[var(--accent-yes)]" />
                        <p className="text-[10px] text-zinc-400">Agents use your World ID to bet — one bet per human, even for AI</p>
                    </div>
                </>
            ) : (
                <div className="text-center py-6">
                    <Bot size={32} className="mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm text-zinc-500">Enable AI trading to let agents bet for you</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Agents analyze data and place optimal bets</p>
                </div>
            )}
        </motion.div>
    )
}
