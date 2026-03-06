'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Gift, Copy, Check, ExternalLink, Wallet } from 'lucide-react'

export function ReferralSystem() {
    const [copied, setCopied] = useState(false)
    const referralCode = 'PYTHIA7X2'
    const referralLink = `https://worldapp://join?ref=${referralCode}`

    const shareText = `Join me on Pythia - the privacy-first prediction market! 🧙‍♂️\n\nUse my link: ${referralLink}\n\nWe both get bonus ETH to bet! 🚀`

    const copyCode = () => {
        navigator.clipboard.writeText(referralCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareToX = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
        window.open(url, '_blank')
    }

    const stats = {
        referrals: 12,
        earned: 0.45,
        pending: 3,
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="solid-card p-4 mt-4"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-yes)] to-[var(--accent-purple)] flex items-center justify-center">
                    <Gift size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">Refer Friends</h3>
                    <p className="text-[10px] text-zinc-500">Earn bonus ETH for each referral</p>
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 p-3 rounded-xl bg-white/5">
                    <p className="text-lg font-bold text-white">{stats.referrals}</p>
                    <p className="text-[10px] text-zinc-500">Referrals</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-[var(--accent-yes)]/10">
                    <p className="text-lg font-bold text-[var(--accent-yes)]">+{stats.earned} ETH</p>
                    <p className="text-[10px] text-zinc-500">Earned</p>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-white/5">
                    <p className="text-lg font-bold text-white">{stats.pending}</p>
                    <p className="text-[10px] text-zinc-500">Pending</p>
                </div>
            </div>

            {/* Referral Code */}
            <div className="p-3 rounded-xl bg-white/5 border border-dashed border-white/10 mb-4">
                <p className="text-[10px] text-zinc-500 uppercase mb-2">Your Code</p>
                <div className="flex items-center justify-between">
                    <span className="text-lg font-mono text-white tracking-wider">{referralCode}</span>
                    <button
                        onClick={copyCode}
                        className="p-2 rounded-lg bg-[var(--accent-purple)]/20 hover:bg-[var(--accent-purple)]/30 transition-colors"
                    >
                        {copied ? (
                            <Check size={16} className="text-[var(--accent-yes)]" />
                        ) : (
                            <Copy size={16} className="text-[var(--accent-purple)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={shareToX}
                    className="flex-1 py-2.5 rounded-xl bg-[#1DA1F2] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110"
                >
                    <ExternalLink size={14} />
                    Share on X
                </button>
                <button
                    onClick={() => {
                        navigator.share({
                            title: 'Join Pythia',
                            text: shareText,
                        })
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20"
                >
                    <Users size={14} />
                    Invite
                </button>
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 mt-4 p-2 rounded-xl bg-[var(--accent-yes)]/5">
                <Gift size={14} className="text-[var(--accent-yes)]" />
                <p className="text-[10px] text-zinc-400">You get 0.05 ETH for each friend who places their first bet</p>
            </div>
        </motion.div>
    )
}
