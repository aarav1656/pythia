'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Shield, Eye, Brain, Globe, Zap, Lock, Wallet, ExternalLink, ArrowRight } from 'lucide-react'
import { useMiniKit, formatAddress } from '@/hooks/useMiniKit'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useContractStats } from '@/hooks/useMarkets'
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
  const contractStats = useContractStats()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [aiTradingEnabled, setAiTradingEnabled] = useState(false)

  const openTrade = () => {
    router.push('/trade')
  }

  return (
    <>
      <Onboarding />
      <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-retro)' }}>

        {/* ─── Header ─── */}
        <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto border-b border-[var(--border-dim)]">
          <div className="flex items-center gap-3">
            {/* Retro logo mark */}
            <div
              className="w-9 h-9 flex items-center justify-center"
              style={{
                border: '1px solid var(--neon-green)',
                boxShadow: '0 0 10px rgba(0,255,136,0.4), inset 0 0 8px rgba(0,255,136,0.06)',
                background: 'rgba(0,255,136,0.06)',
              }}
            >
              <span style={{ color: 'var(--neon-green)', fontSize: 16, textShadow: '0 0 8px var(--neon-green)', fontFamily: 'var(--font-retro)' }}>P</span>
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-retro)',
                fontSize: 14,
                letterSpacing: 4,
                color: 'var(--neon-green)',
                textShadow: '0 0 8px var(--neon-green), 0 0 20px rgba(0,255,136,0.3)',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}>PYTHIA</h1>
              <p style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2, marginTop: 3 }}>PREDICTION_MARKETS v0.1</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DemoModeToggle />
            {isInWorldApp ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                border: '1px solid rgba(255,0,255,0.35)', background: 'rgba(255,0,255,0.07)',
                color: 'var(--neon-magenta)', fontSize: 9, letterSpacing: 2,
                textShadow: '0 0 6px var(--neon-magenta)',
              }}>
                <Globe size={9} />
                <span>WORLD</span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', padding: '3px 8px',
                border: '1px solid var(--border-dim)', background: 'rgba(0,255,136,0.04)',
                color: 'var(--text-dim)', fontSize: 9, letterSpacing: 2,
              }}>
                BROWSER
              </div>
            )}
          </div>
        </header>

        {/* ─── Wallet Status ─── */}
        {isInWorldApp && user.address && (
          <>
            <div className="px-4 max-w-lg mx-auto w-full mt-2">
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', border: '1px solid rgba(0,255,136,0.2)',
                background: 'rgba(0,255,136,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={11} style={{ color: 'var(--neon-green)' }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-retro)', color: 'var(--neon-green)', letterSpacing: 1 }}>
                    {formatAddress(user.address)}
                  </span>
                  {user.isVerified && (
                    <span style={{
                      padding: '1px 6px', fontSize: 9, letterSpacing: 1,
                      background: 'rgba(0,255,136,0.1)', color: 'var(--neon-green)',
                      border: '1px solid rgba(0,255,136,0.3)',
                    }}>✓ VERIFIED</span>
                  )}
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2 }}>GAS-FREE</span>
              </div>
            </div>
            <div className="px-4 max-w-lg mx-auto w-full mt-2">
              <NotificationBanner isEnabled={notificationsEnabled} onToggle={setNotificationsEnabled} />
            </div>
          </>
        )}

        {/* ─── Not in World App Banner ─── */}
        {!isInWorldApp && !isLoading && (
          <div className="px-4 max-w-lg mx-auto w-full mt-2">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              border: '1px solid rgba(255,0,255,0.25)', background: 'rgba(255,0,255,0.05)',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--neon-magenta)', letterSpacing: 1, marginBottom: 3, textShadow: '0 0 6px rgba(255,0,255,0.5)' }}>
                  &gt; OPEN IN WORLD APP
                </p>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>GAS_FREE • WORLD_ID_VERIFIED • MOBILE_NATIVE</p>
              </div>
              <ExternalLink size={14} style={{ color: 'var(--neon-magenta)', flexShrink: 0 }} />
            </div>
          </div>
        )}

        {/* ─── Stats Banner ─── */}
        <div className="px-4 max-w-lg mx-auto w-full mt-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'VOLUME', value: contractStats.totalVolume || (isDemoMode ? '0.233' : '0.000'), unit: 'ETH' },
              { label: 'BETTORS', value: String(contractStats.totalBets || (isDemoMode ? 47 : 0)), unit: '' },
              { label: 'MARKETS', value: String(contractStats.marketCount || (isDemoMode ? 5 : 0)), unit: '' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="stat-glow" style={{
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-dim)',
              }}>
                <p style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 6 }}>{label}</p>
                <p style={{
                  fontSize: 18, fontFamily: 'var(--font-vt)',
                  color: 'var(--neon-amber)',
                  textShadow: '0 0 8px var(--neon-amber)',
                  lineHeight: 1,
                }}>
                  {value} {unit && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Trade CTA ─── */}
        <div className="px-4 max-w-lg mx-auto w-full mt-3">
          <motion.button
            onClick={openTrade}
            whileTap={{ scale: 0.97 }}
            className="w-full relative overflow-hidden scanlines"
            style={{
              padding: '18px 20px',
              border: '1px solid var(--neon-green)',
              background: 'rgba(0,255,136,0.06)',
              boxShadow: '0 0 20px rgba(0,255,136,0.25), inset 0 0 30px rgba(0,255,136,0.04)',
              cursor: 'pointer',
            }}
          >
            {/* Corner accents */}
            <span style={{ position: 'absolute', top: 4, left: 4, width: 10, height: 10, borderTop: '2px solid var(--neon-green)', borderLeft: '2px solid var(--neon-green)' }} />
            <span style={{ position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderTop: '2px solid var(--neon-green)', borderRight: '2px solid var(--neon-green)' }} />
            <span style={{ position: 'absolute', bottom: 4, left: 4, width: 10, height: 10, borderBottom: '2px solid var(--neon-green)', borderLeft: '2px solid var(--neon-green)' }} />
            <span style={{ position: 'absolute', bottom: 4, right: 4, width: 10, height: 10, borderBottom: '2px solid var(--neon-green)', borderRight: '2px solid var(--neon-green)' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{
                  fontSize: 13, letterSpacing: 3, textTransform: 'uppercase',
                  color: 'var(--neon-green)',
                  textShadow: '0 0 10px var(--neon-green), 0 0 30px rgba(0,255,136,0.3)',
                  fontFamily: 'var(--font-retro)',
                  marginBottom: 5,
                }}>
                  [ START TRADING ]
                </p>
                <p style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2 }}>SWIPE_TO_BET_ON_MARKETS</p>
              </div>
              <div style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(0,255,136,0.35)',
                background: 'rgba(0,255,136,0.08)',
              }}>
                <ArrowRight size={18} style={{ color: 'var(--neon-green)' }} />
              </div>
            </div>
          </motion.button>
        </div>

        {/* ─── Features ─── */}
        <div className="px-4 max-w-lg mx-auto w-full mt-3 space-y-3">
          <Portfolio />
          <Achievements />
          <AITrading isEnabled={aiTradingEnabled} onToggle={setAiTradingEnabled} />
          <ReferralSystem />
          <TrustTransparency />
        </div>

        {/* ─── Footer ─── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-4 py-5 max-w-lg mx-auto w-full mt-4"
        >
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-dim)',
            background: 'var(--bg-card)',
            position: 'relative',
          }}>
            <h3 style={{
              fontSize: 9, letterSpacing: 3, color: 'var(--neon-cyan)',
              textShadow: '0 0 6px var(--neon-cyan)',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 14, textTransform: 'uppercase',
            }}>
              <Lock size={10} style={{ color: 'var(--neon-cyan)' }} />
              WHY PYTHIA?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 16, rowGap: 12 }}>
              {[
                { icon: Shield, color: 'var(--neon-green)', title: 'FAIR_ODDS', sub: '1 person = 1 bet via World ID' },
                { icon: Eye, color: 'var(--neon-magenta)', title: 'PRIVATE', sub: 'Chainlink ACE hides bets' },
                { icon: Brain, color: 'var(--neon-cyan)', title: 'AI_RESOLUTION', sub: 'CRE + AI verifies outcomes' },
                { icon: Globe, color: 'var(--neon-amber)', title: 'WORLD_APP', sub: 'Gas-free transactions' },
              ].map(({ icon: Icon, color, title, sub }) => (
                <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Icon size={10} style={{ color, marginTop: 2, flexShrink: 0, filter: `drop-shadow(0 0 4px ${color})` }} />
                  <div>
                    <p style={{ fontSize: 9, color, letterSpacing: 1, textShadow: `0 0 4px ${color}`, marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 0.5 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            <Zap size={9} style={{ color: 'var(--neon-amber)' }} />
            <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 2 }}>
              CHAINLINK_CRE • DATA_FEEDS • ACE • CCIP
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
