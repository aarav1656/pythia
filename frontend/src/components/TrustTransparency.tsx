'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Brain, Globe, Eye, Lock, ChevronRight, CheckCircle, ExternalLink } from 'lucide-react'

interface TrustBadgeProps {
    type: 'verified' | 'resolved' | 'private' | 'secure'
    label: string
    description: string
}

function TrustBadge({ type, label, description }: TrustBadgeProps) {
    const icons = {
        verified: Shield,
        resolved: Brain,
        private: Eye,
        secure: Lock,
    }
    const colors = {
        verified: 'var(--accent-yes)',
        resolved: 'var(--accent-blue)',
        private: 'var(--accent-purple)',
        secure: 'var(--accent-yes)',
    }
    const Icon = icons[type]

    return (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
            <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${colors[type]}20` }}
            >
                <Icon size={18} style={{ color: colors[type] }} />
            </div>
            <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-[10px] text-zinc-500">{description}</p>
            </div>
        </div>
    )
}

export function TrustTransparency() {
    const [showDetails, setShowDetails] = useState(false)

    return (
        <div className="mt-4">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Shield size={16} className="text-[var(--accent-yes)]" />
                    <span className="text-sm text-white">Why trust Pythia?</span>
                </div>
                <ChevronRight 
                    size={16} 
                    className={`text-zinc-500 transition-transform ${showDetails ? 'rotate-90' : ''}`} 
                />
            </button>

            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-3">
                            <TrustBadge
                                type="verified"
                                label="World ID Verified"
                                description="Every bettor is a unique human. No bots, no sybils."
                            />
                            <TrustBadge
                                type="resolved"
                                label="AI Resolution"
                                description="Markets resolve using real data + AI analysis. No manual intervention."
                            />
                            <TrustBadge
                                type="private"
                                label="Private Bets"
                                description="Your bets are encrypted with Chainlink ACE. Even we can't see them."
                            />
                            <TrustBadge
                                type="secure"
                                label="Audited Contracts"
                                description="Smart contracts audited by top firms. Funds are secure."
                            />

                            {/* How it works */}
                            <div className="mt-4 p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
                                <p className="text-xs font-semibold text-white mb-2">How resolution works:</p>
                                <ol className="text-[10px] text-zinc-400 space-y-1">
                                    <li>1. Market ends at specified time</li>
                                    <li>2. CRE fetches real data (CoinGecko, ESPN, etc.)</li>
                                    <li>3. AI analyzes data and determines outcome</li>
                                    <li>4. Resolution is recorded on-chain</li>
                                    <li>5. Winners can claim their payouts</li>
                                </ol>
                                <a 
                                    href="#" 
                                    className="flex items-center gap-1 mt-2 text-[10px] text-[var(--accent-purple)]"
                                >
                                    View contract on Etherscan <ExternalLink size={10} />
                                </a>
                            </div>

                            {/* Audit badge */}
                            <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-white/5">
                                <CheckCircle size={14} className="text-[var(--accent-yes)]" />
                                <span className="text-[10px] text-zinc-400">Audited by Trail of Bits</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
