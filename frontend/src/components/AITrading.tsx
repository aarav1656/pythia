'use client'

import { motion } from 'framer-motion'
import { Bot, Zap, Shield, Play, Pause, TrendingUp, Loader2, AlertCircle } from 'lucide-react'
import { useAITrading } from '@/hooks/useAITrading'

interface AITradingProps {
    isEnabled: boolean
    onToggle: (enabled: boolean) => void
}

export function AITrading({ isEnabled, onToggle }: AITradingProps) {
    const { 
        activeAgents, 
        toggleAgent, 
        predictions, 
        isLoading,
        agentConfigs,
        getAggregatedPrediction
    } = useAITrading()

    const hasApiKey = !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    const aggregated = getAggregatedPrediction()

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="solid-card p-4 mt-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot size={18} className="text-[var(--accent-purple)]" />
                    <h3 className="text-sm font-semibold text-white">AI Trading Agents</h3>
                    {isLoading && <Loader2 size={14} className="animate-spin text-[var(--accent-purple)]" />}
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

            {/* API Key Warning */}
            {!hasApiKey && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                    <AlertCircle size={16} className="text-yellow-500 shrink-0" />
                    <p className="text-[10px] text-yellow-500">
                        Set NEXT_PUBLIC_OPENROUTER_API_KEY to enable AI agents
                    </p>
                </div>
            )}

            {isEnabled ? (
                <>
                    {/* Aggregated Prediction */}
                    {predictions.size > 0 && (
                        <div className="mb-4 p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30">
                            <p className="text-[10px] text-[var(--accent-purple)] uppercase mb-1">Consensus</p>
                            <p className="text-lg font-bold text-white">
                                {aggregated === 'YES' && '📈 YES'}
                                {aggregated === 'NO' && '📉 NO'}
                                {!aggregated && '🤔 Uncertain'}
                            </p>
                        </div>
                    )}

                    {/* Agent List */}
                    <div className="space-y-2">
                        {agentConfigs.map(config => {
                            const isActive = activeAgents.has(config.id)
                            const prediction = predictions.get(config.id)

                            return (
                                <div 
                                    key={config.id}
                                    className={`p-3 rounded-xl border transition-all ${
                                        isActive 
                                            ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/30' 
                                            : 'bg-white/[0.03] border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{config.icon}</span>
                                            <div>
                                                <p className="text-sm font-medium text-white">{config.name}</p>
                                                <p className="text-[10px] text-zinc-500">{config.description}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleAgent(config.id)}
                                            disabled={!hasApiKey}
                                            className={`p-2 rounded-lg transition-colors ${
                                                isActive 
                                                    ? 'bg-[var(--accent-yes)] text-black' 
                                                    : 'bg-white/10 text-zinc-400 hover:bg-white/20 disabled:opacity-50'
                                            }`}
                                        >
                                            {isActive ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                    </div>
                                    
                                    {/* Live Prediction */}
                                    {isActive && prediction && (
                                        <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1">
                                                {prediction.prediction === 'YES' ? (
                                                    <TrendingUp size={12} className="text-[var(--accent-yes)]" />
                                                ) : (
                                                    <TrendingUp size={12} className="text-[var(--accent-no)] rotate-180" />
                                                )}
                                                <span className={`text-[10px] font-medium ${
                                                    prediction.prediction === 'YES' 
                                                        ? 'text-[var(--accent-yes)]' 
                                                        : 'text-[var(--accent-no)]'
                                                }`}>
                                                    {prediction.prediction} ({prediction.confidence}%)
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 truncate">
                                                {prediction.reasoning.slice(0, 50)}...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-white/5">
                        <Shield size={14} className="text-[var(--accent-yes)]" />
                        <p className="text-[10px] text-zinc-400">Agents use OpenRouter AI to analyze markets in real-time</p>
                    </div>
                </>
            ) : (
                <div className="text-center py-6">
                    <Bot size={32} className="mx-auto mb-2 text-zinc-600" />
                    <p className="text-sm text-zinc-500">Enable AI trading to let agents bet for you</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Powered by OpenRouter (Gemini, GPT, Claude)</p>
                </div>
            )}
        </motion.div>
    )
}
