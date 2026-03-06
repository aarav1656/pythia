'use client'

import { CardStack } from '@/components/CardStack'
import { SEED_MARKETS } from '@/lib/markets'
import { useMiniKit, formatAddress } from '@/hooks/useMiniKit'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Shield, Eye, Brain, Globe, Zap, Lock, Wallet, ExternalLink } from 'lucide-react'
import { Portfolio } from '@/components/Portfolio'
import { CreateMarketModal, CreateMarketFAB } from '@/components/CreateMarket'
import { Onboarding } from '@/components/Onboarding'
import { NotificationBanner } from '@/components/Notifications'

export default function Home() {
  const { user, isLoading, isInWorldApp, verifyWorldID } = useMiniKit()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  return (
    <>
      <Onboarding />
      <div className="min-h-screen flex flex-col">

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 py-4 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-yes)] flex items-center justify-center">
            <span className="text-lg">🔮</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Pythia</h1>
            <p className="text-[10px] text-zinc-500 -mt-0.5">Private Prediction Markets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* World App Status */}
          {isInWorldApp ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--accent-purple)]/20 border border-[var(--accent-purple)]/30">
              <Globe size={12} className="text-[var(--accent-purple)]" />
              <span className="text-[10px] text-[var(--accent-purple)] font-medium">World App</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-[10px] text-zinc-500">Browser</span>
            </div>
          )}
        </div>
      </header>

      {/* Wallet / Verification Status */}
      {isInWorldApp && user.address && (
        <div className="px-4 max-w-lg mx-auto w-full mb-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-[var(--accent-yes)]" />
              <span className="text-xs text-white">{formatAddress(user.address)}</span>
              {user.isVerified && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-yes)]/15 text-[8px] text-[var(--accent-yes)] font-medium">
                  ✓ Verified
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500">Gas-free</span>
          </div>
        </div>
        
        {/* Notifications Toggle */}
        <div className="px-4 max-w-lg mx-auto w-full mb-3">
          <NotificationBanner 
            isEnabled={notificationsEnabled} 
            onToggle={setNotificationsEnabled} 
          />
        </div>
      )}

      {/* Not in World App Banner */}
      {!isInWorldApp && !isLoading && (
        <div className="px-4 max-w-lg mx-auto w-full mb-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
            <div>
              <p className="text-xs text-white font-medium mb-0.5">Open in World App for best experience</p>
              <p className="text-[10px] text-zinc-400">Gas-free bets • World ID verification • Native mobile UX</p>
            </div>
            <ExternalLink size={16} className="text-[var(--accent-purple)] shrink-0" />
          </div>
        </div>
      )}

      {/* Stats Banner */}
      <div className="px-4 max-w-lg mx-auto w-full mb-4">
        <div className="flex gap-2">
          <div className="flex-1 stat-glow rounded-2xl p-3 bg-white/[0.02]">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Volume</p>
            <p className="text-lg font-bold text-white">0.233 <span className="text-xs text-zinc-500">ETH</span></p>
          </div>
          <div className="flex-1 stat-glow rounded-2xl p-3 bg-white/[0.02]">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Bettors</p>
            <p className="text-lg font-bold text-white">47</p>
          </div>
          <div className="flex-1 stat-glow rounded-2xl p-3 bg-white/[0.02]">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Markets</p>
            <p className="text-lg font-bold text-white">{SEED_MARKETS.length}</p>
          </div>
        </div>
      </div>

      {/* Portfolio & Leaderboard */}
      <div className="px-4 max-w-lg mx-auto w-full">
        <Portfolio />
      </div>

      {/* Swipe Instructions */}
      <div className="px-4 max-w-lg mx-auto w-full mb-2">
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 float-anim">
          <span className="flex items-center gap-1">
            <span className="text-[var(--accent-no)]">←</span> NO
          </span>
          <span className="text-zinc-600">swipe to bet</span>
          <span className="flex items-center gap-1">
            YES <span className="text-[var(--accent-yes)]">→</span>
          </span>
        </div>
      </div>

      {/* Card Stack */}
      <div className="flex-1 px-4 max-w-lg mx-auto w-full">
        <CardStack />
      </div>

      {/* Privacy & Tech Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-4 py-8 max-w-lg mx-auto w-full"
      >
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Lock size={14} className="text-[var(--accent-purple)]" />
            Why Pythia?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Shield size={14} className="text-[var(--accent-yes)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Fair Odds</p>
                <p className="text-[10px] text-zinc-500">World ID: 1 person = 1 bet. No whale manipulation.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye size={14} className="text-[var(--accent-purple)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Private Bets</p>
                <p className="text-[10px] text-zinc-500">Chainlink ACE hides your bet from everyone.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Brain size={14} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">AI Resolution</p>
                <p className="text-[10px] text-zinc-500">CRE verifies outcomes from multiple sources.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe size={14} className="text-[var(--accent-yes)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">World Mini App</p>
                <p className="text-[10px] text-zinc-500">Gas-free betting in World App.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chainlink Badge */}
        <div className="flex items-center justify-center gap-2 mt-6 mb-2">
          <Zap size={12} className="text-[var(--accent-blue)]" />
          <span className="text-[10px] text-zinc-600">
            Powered by Chainlink CRE • Data Feeds • ACE • Confidential HTTP • CCIP
          </span>
        </div>
      </motion.footer>

      {/* Create Market FAB */}
      <CreateMarketFAB onClick={() => setShowCreateModal(true)} />
      
      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(question, category) => {
          console.log('Creating market:', question, category)
          // In production: call contract to create market
        }}
      />
    </>
  )
}
