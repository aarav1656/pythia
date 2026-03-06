'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Shield, Eye, Brain, Globe, Zap, Lock, Wallet, ExternalLink, TrendingUp, ArrowRight } from 'lucide-react'
import { useMiniKit, formatAddress } from '@/hooks/useMiniKit'
import { useDemoMode } from '@/hooks/useDemoMode'
import { Portfolio } from '@/components/Portfolio'
import { Achievements } from '@/components/Achievements'
import { CreateMarketModal, CreateMarketFAB } from '@/components/CreateMarket'
import { Onboarding } from '@/components/Onboarding'
import { NotificationBanner } from '@/components/Notifications'
import { AITrading } from '@/components/AITrading'
import { ReferralSystem } from '@/components/ReferralSystem'
import { TrustTransparency } from '@/components/TrustTransparency'
import { DemoModeToggle } from '@/components/DemoModeToggle'

export default function Home() {
  const router = useRouter()
  const { user, isLoading, isInWorldApp } = useMiniKit()
  const { isDemoMode } = useDemoMode()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [aiTradingEnabled, setAiTradingEnabled] = useState(false)

  const openTrade = () => {
    router.push('/trade')
  }

  return (
    <>
      <Onboarding />
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--card-bg)] border border-white/8 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">P</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">Pythia</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">Prediction Markets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DemoModeToggle />
            {isInWorldApp ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
                <Globe size={11} className="text-[var(--accent-purple)]" />
                <span className="text-[10px] text-[var(--accent-purple)] font-medium">World</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/8">
                <span className="text-[10px] text-zinc-500">Browser</span>
              </div>
            )}
          </div>
        </header>

        {/* Wallet Status */}
        {isInWorldApp && user.address && (
          <>
            <div className="px-4 max-w-lg mx-auto w-full mb-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--card-bg)] border border-white/6">
                <div className="flex items-center gap-2">
                  <Wallet size={12} className="text-[var(--accent-yes)]" />
                  <span className="text-xs text-white font-mono">{formatAddress(user.address)}</span>
                  {user.isVerified && (
                    <span className="px-1.5 py-0.5 rounded bg-[var(--accent-yes)]/10 text-[9px] text-[var(--accent-yes)] font-medium">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500">gas-free</span>
              </div>
            </div>
            <div className="px-4 max-w-lg mx-auto w-full mb-2">
              <NotificationBanner isEnabled={notificationsEnabled} onToggle={setNotificationsEnabled} />
            </div>
          </>
        )}

        {/* Not in World App Banner */}
        {!isInWorldApp && !isLoading && (
          <div className="px-4 max-w-lg mx-auto w-full mb-2">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--accent-purple)]/8 border border-[var(--accent-purple)]/15">
              <div>
                <p className="text-xs text-white font-medium mb-0.5">Open in World App</p>
                <p className="text-[10px] text-zinc-400">Gas-free • World ID verified • Mobile native</p>
              </div>
              <ExternalLink size={14} className="text-[var(--accent-purple)] shrink-0" />
            </div>
          </div>
        )}

        {/* Stats Banner */}
        <div className="px-4 max-w-lg mx-auto w-full mb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="stat-glow rounded-xl p-3 bg-[var(--card-bg)]">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Volume</p>
              <p className="text-base font-bold text-white">{isDemoMode ? '0.233' : '0.00'} <span className="text-[10px] text-zinc-500">ETH</span></p>
            </div>
            <div className="stat-glow rounded-xl p-3 bg-[var(--card-bg)]">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Bettors</p>
              <p className="text-base font-bold text-white">{isDemoMode ? '47' : '0'}</p>
            </div>
            <div className="stat-glow rounded-xl p-3 bg-[var(--card-bg)]">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Markets</p>
              <p className="text-base font-bold text-white">{isDemoMode ? '5' : '0'}</p>
            </div>
          </div>
        </div>

        {/* Trade CTA - Gamified */}
        <div className="px-4 max-w-lg mx-auto w-full mb-4">
          <button
            onClick={openTrade}
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-blue)] p-4 group active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)]/80 to-[var(--accent-blue)]/80 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="text-left">
                <p className="text-white font-semibold text-base">Start Trading</p>
                <p className="text-white/70 text-xs">Swipe to bet on markets</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight size={20} className="text-white" />
              </div>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="px-4 max-w-lg mx-auto w-full space-y-3">
          <Portfolio />
          <Achievements />
          <AITrading isEnabled={aiTradingEnabled} onToggle={setAiTradingEnabled} />
          <ReferralSystem />
          <TrustTransparency />
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-4 py-5 max-w-lg mx-auto w-full mt-4"
        >
          <div className="solid-card p-4">
            <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Lock size={12} className="text-[var(--accent-purple)]" />
              Why Pythia?
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-start gap-2">
                <Shield size={12} className="text-[var(--accent-yes)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-white">Fair Odds</p>
                  <p className="text-[9px] text-zinc-500">1 person = 1 bet via World ID</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Eye size={12} className="text-[var(--accent-purple)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-white">Private</p>
                  <p className="text-[9px] text-zinc-500">Chainlink ACE hides bets</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Brain size={12} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-white">AI Resolution</p>
                  <p className="text-[9px] text-zinc-500">CRE + AI verifies outcomes</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe size={12} className="text-[var(--accent-yes)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-white">World Mini App</p>
                  <p className="text-[9px] text-zinc-500">Gas-free transactions</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <Zap size={10} className="text-[var(--accent-blue)]" />
            <span className="text-[9px] text-zinc-600">
              Chainlink CRE • Data Feeds • ACE • CCIP
            </span>
          </div>
        </motion.footer>

        {/* FAB and Modal */}
        <CreateMarketFAB onClick={() => setShowCreateModal(true)} />
        <CreateMarketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(question, category) => {
            console.log('Creating market:', question, category)
          }}
        />
      </div>
    </>
  )
}
