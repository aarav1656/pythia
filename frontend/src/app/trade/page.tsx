'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining, getPotentialPayout } from '@/lib/markets'
import { useMiniKit } from '@/hooks/useMiniKit'
import { useMarkets } from '@/hooks/useMarkets'
import { Clock, Users, TrendingUp, ChevronDown, X, Check, RotateCcw, Loader2, Wifi } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SWIPE_THRESHOLD = 80

function useHaptic() {
    const trigger = useCallback((type: 'success' | 'error' | 'light') => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            const patterns = { success: 30, error: 20, light: 10 }
            navigator.vibrate(patterns[type])
        }
    }, [])
    return trigger
}

export default function TradePage() {
    const router = useRouter()
    const { isInWorldApp, placeBet } = useMiniKit()
    const { markets, isLoading: marketsLoading, onChainCount } = useMarkets()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [swipedMarkets, setSwipedMarkets] = useState<{ market: Market; side: 'yes' | 'no' }[]>([])
    const [expanded, setExpanded] = useState(false)
    const [showConfirm, setShowConfirm] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null)
    const [isBetting, setIsBetting] = useState(false)
    const [betError, setBetError] = useState<string | null>(null)

    // All motion hooks at top level (required by React rules of hooks)
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-300, 0, 300], [-8, 0, 8])
    const yesOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
    const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

    const haptic = useHaptic()

    const currentMarket = markets[currentIndex]
    const hasMoreMarkets = currentIndex < markets.length

    const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
        if (!currentMarket) return
        if (info.offset.x > SWIPE_THRESHOLD) {
            haptic('success')
            setShowConfirm({ market: currentMarket, side: 'yes' })
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            haptic('success')
            setShowConfirm({ market: currentMarket, side: 'no' })
        }
    }, [currentMarket, haptic])

    const confirmBet = useCallback(async () => {
        if (!showConfirm || isBetting) return
        setBetError(null)
        setIsBetting(true)
        try {
            // Bet 0.001 ETH by default (well below maxBetPerPerson); ensures testnet users
            // with limited ETH can still participate
            const betAmount = Math.min(0.001, showConfirm.market.maxBetPerPerson)
            await placeBet(
                showConfirm.market.id,
                showConfirm.side === 'yes',
                betAmount,
            )
            haptic('success')
            setSwipedMarkets(prev => [...prev, { market: showConfirm.market, side: showConfirm.side }])
            setCurrentIndex(prev => prev + 1)
            setShowConfirm(null)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Transaction failed'
            if (msg === 'rejected') {
                setBetError('Cancelled')
            } else if (msg.includes('insufficient') || msg.includes('balance')) {
                setBetError('Insufficient ETH — get testnet ETH from faucet')
            } else {
                setBetError(msg)
            }
            haptic('error')
        } finally {
            setIsBetting(false)
        }
    }, [showConfirm, isBetting, placeBet, haptic])

    const skipMarket = useCallback(() => {
        setCurrentIndex(prev => prev + 1)
    }, [])

    // ─── Loading state ───
    if (marketsLoading) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', fontFamily: 'var(--font-retro)' }}>
                <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto border-b border-[var(--border-dim)]">
                    <button onClick={() => router.back()} style={{ padding: 6 }}>
                        <X size={18} style={{ color: 'var(--text-dim)' }} />
                    </button>
                    <span style={{ fontSize: 11, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>TRADE</span>
                    <div style={{ width: 30 }} />
                </header>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <Loader2 size={28} style={{ color: 'var(--neon-green)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 3 }}>LOADING_MARKETS...</p>
                    <p style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 2 }}>READING_ON-CHAIN_DATA</p>
                </div>
            </div>
        )
    }

    // ─── Empty state ───
    if (!hasMoreMarkets) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', fontFamily: 'var(--font-retro)' }}>
                <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto border-b border-[var(--border-dim)]">
                    <button onClick={() => router.back()} style={{ padding: 6 }}>
                        <X size={18} style={{ color: 'var(--text-dim)' }} />
                    </button>
                    <span style={{ fontSize: 11, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>
                        TRADE
                    </span>
                    <div style={{ width: 30 }} />
                </header>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{
                        padding: '32px 24px', textAlign: 'center', maxWidth: 300,
                        border: '1px solid var(--border-dim)', background: 'var(--bg-card)',
                        position: 'relative',
                    }}>
                        <span style={{ position: 'absolute', top: 6, left: 6, width: 12, height: 12, borderTop: '1px solid var(--neon-green)', borderLeft: '1px solid var(--neon-green)' }} />
                        <span style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderTop: '1px solid var(--neon-green)', borderRight: '1px solid var(--neon-green)' }} />
                        <span style={{ position: 'absolute', bottom: 6, left: 6, width: 12, height: 12, borderBottom: '1px solid var(--neon-green)', borderLeft: '1px solid var(--neon-green)' }} />
                        <span style={{ position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderBottom: '1px solid var(--neon-green)', borderRight: '1px solid var(--neon-green)' }} />

                        <p style={{ fontSize: 24, fontFamily: 'var(--font-vt)', color: 'var(--neon-amber)', textShadow: '0 0 8px var(--neon-amber)', marginBottom: 12 }}>
                            --- END ---
                        </p>
                        <p style={{ fontSize: 11, letterSpacing: 2, color: 'var(--neon-green)', marginBottom: 6 }}>
                            NO_MORE_MARKETS
                        </p>
                        {swipedMarkets.length > 0 && (
                            <p style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 20 }}>
                                BETS_PLACED: {swipedMarkets.length}
                            </p>
                        )}
                        <button
                            onClick={() => { setCurrentIndex(0); setSwipedMarkets([]) }}
                            style={{
                                padding: '10px 20px', fontSize: 10, letterSpacing: 2,
                                border: '1px solid var(--neon-green)',
                                background: 'rgba(0,255,136,0.08)',
                                color: 'var(--neon-green)',
                                textTransform: 'uppercase',
                                boxShadow: '0 0 12px rgba(0,255,136,0.25)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
                            }}
                        >
                            <RotateCcw size={12} />
                            BROWSE_AGAIN
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const market = currentMarket
    const odds = getOdds(market)
    const timeLeft = getTimeRemaining(market.endTime)

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', fontFamily: 'var(--font-retro)' }}>

            {/* ─── Header ─── */}
            <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto border-b border-[var(--border-dim)]">
                <button onClick={() => router.back()} style={{ padding: 6 }}>
                    <X size={18} style={{ color: 'var(--text-dim)' }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* On-chain indicator */}
                    {onChainCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Wifi size={8} style={{ color: 'var(--neon-green)' }} />
                            <span style={{ fontSize: 7, color: 'var(--neon-green)', letterSpacing: 1 }}>LIVE</span>
                        </div>
                    )}
                    {/* Segmented progress */}
                    <div style={{ display: 'flex', gap: 3 }}>
                        {markets.slice(0, 5).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: 16, height: 4,
                                    background: i <= currentIndex
                                        ? 'var(--neon-green)'
                                        : 'rgba(0,255,136,0.1)',
                                    boxShadow: i <= currentIndex ? '0 0 6px rgba(0,255,136,0.6)' : 'none',
                                    transition: 'all 0.3s',
                                }}
                            />
                        ))}
                        {markets.length > 5 && (
                            <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>+{markets.length - 5}</span>
                        )}
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2 }}>
                        {currentIndex + 1}/{markets.length}
                    </span>
                </div>
                <button onClick={skipMarket} style={{
                    padding: '4px 10px', fontSize: 9, letterSpacing: 2,
                    border: '1px solid var(--border-dim)', color: 'var(--text-dim)',
                    background: 'transparent', cursor: 'pointer',
                }}>
                    SKIP
                </button>
            </header>

            {/* ─── Card Area ─── */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px' }}>
                <motion.div
                    style={{ width: '100%', maxWidth: 360 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={currentIndex}
                >
                    <motion.div
                        style={{
                            x, rotate,
                            border: '1px solid var(--border-dim)',
                            background: 'var(--bg-card)',
                            position: 'relative',
                            cursor: 'grab',
                            boxShadow: '0 0 30px rgba(0,255,136,0.06)',
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDragEnd={handleDragEnd}
                        whileTap={{ scale: 1.01, cursor: 'grabbing' }}
                    >
                        {/* ─── YES Swipe Overlay ─── */}
                        <motion.div
                            style={{
                                position: 'absolute', inset: 0, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none', zIndex: 20, opacity: yesOpacity,
                            }}
                        >
                            <div style={{
                                position: 'absolute', inset: 0,
                                border: '2px solid var(--neon-green)',
                                boxShadow: '0 0 30px rgba(0,255,136,0.5), inset 0 0 30px rgba(0,255,136,0.04)',
                            }} />
                            <div style={{
                                padding: '8px 20px', border: '1px solid var(--neon-green)',
                                background: 'rgba(0,255,136,0.12)',
                                transform: 'rotate(-6deg)',
                                boxShadow: '0 0 20px rgba(0,255,136,0.4)',
                            }}>
                                <span style={{
                                    fontSize: 20, letterSpacing: 6,
                                    color: 'var(--neon-green)',
                                    textShadow: '0 0 12px var(--neon-green)',
                                    fontFamily: 'var(--font-retro)',
                                }}>YES</span>
                            </div>
                        </motion.div>

                        {/* ─── NO Swipe Overlay ─── */}
                        <motion.div
                            style={{
                                position: 'absolute', inset: 0, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                pointerEvents: 'none', zIndex: 20, opacity: noOpacity,
                            }}
                        >
                            <div style={{
                                position: 'absolute', inset: 0,
                                border: '2px solid var(--neon-red)',
                                boxShadow: '0 0 30px rgba(255,34,68,0.5), inset 0 0 30px rgba(255,34,68,0.04)',
                            }} />
                            <div style={{
                                padding: '8px 20px', border: '1px solid var(--neon-red)',
                                background: 'rgba(255,34,68,0.12)',
                                transform: 'rotate(6deg)',
                                boxShadow: '0 0 20px rgba(255,34,68,0.4)',
                            }}>
                                <span style={{
                                    fontSize: 20, letterSpacing: 6,
                                    color: 'var(--neon-red)',
                                    textShadow: '0 0 12px var(--neon-red)',
                                    fontFamily: 'var(--font-retro)',
                                }}>NO</span>
                            </div>
                        </motion.div>

                        {/* ─── Card Content ─── */}
                        <div style={{ padding: '20px' }}>
                            {/* Category & Timer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span className={`badge ${CATEGORY_COLORS[market.category]}`}>
                                    {CATEGORY_ICONS[market.category]} {market.category}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Clock size={10} style={{ color: 'var(--neon-amber)' }} />
                                    <span style={{ fontSize: 9, color: 'var(--neon-amber)', letterSpacing: 1, textShadow: '0 0 4px rgba(255,170,0,0.5)' }}>{timeLeft}</span>
                                </div>
                            </div>

                            {/* Question */}
                            <h2 style={{
                                fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)',
                                marginBottom: 16, fontFamily: 'var(--font-retro)',
                                borderLeft: '2px solid var(--neon-green)',
                                paddingLeft: 10,
                                boxShadow: '-4px 0 12px rgba(0,255,136,0.15)',
                            }}>
                                {market.question}
                            </h2>

                            {/* Odds */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 10, letterSpacing: 2, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>
                                        YES {odds.yes}%
                                    </span>
                                    <span style={{ fontSize: 10, letterSpacing: 2, color: 'var(--neon-red)', textShadow: '0 0 6px var(--neon-red)' }}>
                                        {odds.no}% NO
                                    </span>
                                </div>
                                <div className="odds-bar" style={{ display: 'flex' }}>
                                    <div className="odds-fill-yes" style={{ width: `${odds.yes}%` }} />
                                    <div className="odds-fill-no" style={{ width: `${odds.no}%` }} />
                                </div>
                            </div>

                            {/* AI Confidence (from Jupiter prices) */}
                            {market.aiConfidence > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '5px 8px', marginBottom: 12,
                                    background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.08)',
                                }}>
                                    <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>AI_CONFIDENCE</span>
                                    <span style={{
                                        fontSize: 9, letterSpacing: 1,
                                        color: market.aiConfidence > 60 ? 'var(--neon-green)' : market.aiConfidence < 40 ? 'var(--neon-red)' : 'var(--neon-amber)',
                                    }}>
                                        {market.aiConfidence}% YES
                                    </span>
                                </div>
                            )}

                            {/* Stats */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Users size={10} style={{ color: 'var(--text-dim)' }} />
                                    <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{market.betCount}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <TrendingUp size={10} style={{ color: 'var(--text-dim)' }} />
                                    <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>
                                        {(market.yesPool + market.noPool).toFixed(3)} ETH
                                    </span>
                                </div>
                            </div>

                            {/* Expand */}
                            <button
                                onClick={() => setExpanded(!expanded)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    padding: '6px 0', fontSize: 9, letterSpacing: 2, color: 'var(--text-dim)',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    borderTop: '1px solid rgba(0,255,136,0.08)',
                                }}
                            >
                                <span>{expanded ? 'COLLAPSE' : 'DETAILS'}</span>
                                <ChevronDown size={10} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {expanded && (
                                <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { label: 'MAX_BET', value: `${market.maxBetPerPerson} ETH`, color: 'var(--text-primary)' },
                                        { label: 'PAYOUT_YES', value: `${getPotentialPayout(market.maxBetPerPerson, market, true).toFixed(4)} ETH`, color: 'var(--neon-green)' },
                                        { label: 'PAYOUT_NO', value: `${getPotentialPayout(market.maxBetPerPerson, market, false).toFixed(4)} ETH`, color: 'var(--neon-red)' },
                                        { label: 'SOURCE', value: onChainCount > 0 ? 'ON-CHAIN' : 'SEED', color: 'var(--text-dim)' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            padding: '6px 8px', background: 'rgba(0,255,136,0.025)',
                                            border: '1px solid rgba(0,255,136,0.06)',
                                        }}>
                                            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</span>
                                            <span style={{ fontSize: 9, color, letterSpacing: 1 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* ─── Action Buttons ─── */}
            <div style={{ padding: '0 16px 24px', maxWidth: 448, margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                    {/* NO button */}
                    <button
                        onClick={() => { haptic('light'); setShowConfirm({ market, side: 'no' }) }}
                        style={{
                            width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(255,34,68,0.45)',
                            background: 'rgba(255,34,68,0.07)',
                            boxShadow: '0 0 16px rgba(255,34,68,0.2)',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 28px rgba(255,34,68,0.5)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(255,34,68,0.2)')}
                    >
                        <X size={22} style={{ color: 'var(--neon-red)', filter: 'drop-shadow(0 0 4px rgba(255,34,68,0.6))' }} />
                    </button>
                    {/* YES button */}
                    <button
                        onClick={() => { haptic('light'); setShowConfirm({ market, side: 'yes' }) }}
                        style={{
                            width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(0,255,136,0.45)',
                            background: 'rgba(0,255,136,0.07)',
                            boxShadow: '0 0 16px rgba(0,255,136,0.2)',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 28px rgba(0,255,136,0.5)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(0,255,136,0.2)')}
                    >
                        <Check size={22} style={{ color: 'var(--neon-green)', filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.6))' }} />
                    </button>
                </div>
                <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginTop: 10, letterSpacing: 2 }}>
                    SWIPE_OR_TAP_TO_BET
                </p>
            </div>

            {/* ─── Confirm Modal ─── */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 50,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.85)', padding: 16,
                            backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setShowConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.88, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.88, opacity: 0 }}
                            style={{
                                maxWidth: 300, width: '100%', padding: '24px 20px',
                                background: 'var(--bg-card)',
                                border: `1px solid ${showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                                boxShadow: showConfirm.side === 'yes'
                                    ? '0 0 32px rgba(0,255,136,0.3)'
                                    : '0 0 32px rgba(255,34,68,0.3)',
                                position: 'relative',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {['top-3 left-3 border-t border-l', 'top-3 right-3 border-t border-r', 'bottom-3 left-3 border-b border-l', 'bottom-3 right-3 border-b border-r'].map((cls, i) => (
                                <span key={i} className={`absolute ${cls} w-3 h-3`} style={{
                                    borderColor: showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)',
                                }} />
                            ))}

                            <p style={{
                                fontSize: 14, letterSpacing: 4, textAlign: 'center',
                                fontFamily: 'var(--font-retro)',
                                color: showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)',
                                textShadow: showConfirm.side === 'yes'
                                    ? '0 0 10px var(--neon-green)' : '0 0 10px var(--neon-red)',
                                marginBottom: 8,
                            }}>
                                BET {showConfirm.side.toUpperCase()}?
                            </p>
                            <p style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', letterSpacing: 1, marginBottom: 20, lineHeight: 1.6 }}>
                                {showConfirm.market.question}
                            </p>

                            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(() => {
                                    const betAmount = Math.min(0.001, showConfirm.market.maxBetPerPerson)
                                    return [
                                        { label: 'AMOUNT', value: `${betAmount} ETH` },
                                        {
                                            label: 'PAYOUT',
                                            value: `${getPotentialPayout(betAmount, showConfirm.market, showConfirm.side === 'yes').toFixed(4)} ETH`,
                                            highlight: true,
                                        },
                                    ]
                                })().map(({ label, value, highlight }) => (
                                    <div key={label} style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '7px 10px',
                                        background: 'rgba(0,255,136,0.025)', border: '1px solid rgba(0,255,136,0.06)',
                                    }}>
                                        <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</span>
                                        <span style={{
                                            fontSize: 9, letterSpacing: 1,
                                            color: highlight
                                                ? (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)')
                                                : 'var(--text-primary)',
                                        }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Error message */}
                            {betError && (
                                <p style={{
                                    fontSize: 9, color: 'var(--neon-red)', textAlign: 'center',
                                    letterSpacing: 1, marginBottom: 10,
                                    textShadow: '0 0 6px rgba(255,34,68,0.5)',
                                    lineHeight: 1.5,
                                }}>
                                    {betError === 'Cancelled' ? 'CANCELLED' : betError.slice(0, 60)}
                                </p>
                            )}

                            {/* Betting status */}
                            {isBetting && (
                                <p style={{
                                    fontSize: 9, color: 'var(--neon-green)', textAlign: 'center',
                                    letterSpacing: 1, marginBottom: 10, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                    VERIFYING_WORLD_ID...
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => { setShowConfirm(null); setBetError(null) }}
                                    disabled={isBetting}
                                    style={{
                                        flex: 1, padding: '10px 0', fontSize: 9, letterSpacing: 2,
                                        border: '1px solid var(--border-dim)', color: 'var(--text-dim)',
                                        background: 'transparent', cursor: isBetting ? 'not-allowed' : 'pointer',
                                        textTransform: 'uppercase', opacity: isBetting ? 0.4 : 1,
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={confirmBet}
                                    disabled={isBetting}
                                    style={{
                                        flex: 1, padding: '10px 0', fontSize: 9, letterSpacing: 2,
                                        border: `1px solid ${showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                                        background: isBetting ? 'transparent' : (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'),
                                        color: isBetting ? (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)') : '#000',
                                        cursor: isBetting ? 'not-allowed' : 'pointer',
                                        textTransform: 'uppercase', fontWeight: 700,
                                        boxShadow: showConfirm.side === 'yes'
                                            ? '0 0 14px rgba(0,255,136,0.5)' : '0 0 14px rgba(255,34,68,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    }}
                                >
                                    {isBetting
                                        ? <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> SIGNING...</>
                                        : 'CONFIRM'
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
