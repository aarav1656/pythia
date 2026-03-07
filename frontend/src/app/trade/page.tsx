'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining, getPotentialPayout } from '@/lib/markets'
import { useMiniKit } from '@/hooks/useMiniKit'
import { useMarkets } from '@/hooks/useMarkets'
import { Clock, Users, TrendingUp, X, Check, Loader2, Wifi, ArrowLeft } from 'lucide-react'
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

// Per-card component so each card has its own motion values that reset independently
function MarketCard({
    market,
    onBet,
    haptic,
    success,
}: {
    market: Market
    onBet: (market: Market, side: 'yes' | 'no') => void
    haptic: ReturnType<typeof useHaptic>
    success: boolean
}) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-300, 0, 300], [-6, 0, 6])
    const yesOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
    const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

    const odds = getOdds(market)
    const timeLeft = getTimeRemaining(market.endTime)

    const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
            haptic('success')
            x.set(0)
            onBet(market, 'yes')
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            haptic('success')
            x.set(0)
            onBet(market, 'no')
        } else {
            x.set(0)
        }
    }, [market, onBet, haptic, x])

    return (
        <div style={{ padding: '0 16px 24px' }}>
            {success && (
                <div style={{
                    marginBottom: 8, padding: '8px 12px', textAlign: 'center',
                    background: 'rgba(0,255,136,0.08)', border: '1px solid var(--neon-green)',
                    fontSize: 9, letterSpacing: 3, color: 'var(--neon-green)',
                }}>
                    BET PLACED
                </div>
            )}

            <motion.div
                style={{
                    x, rotate,
                    border: '1px solid var(--border-dim)',
                    background: 'var(--bg-card)',
                    cursor: 'grab',
                    position: 'relative',
                    userSelect: 'none',
                    boxShadow: '0 0 24px rgba(0,255,136,0.04)',
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                whileTap={{ cursor: 'grabbing' }}
            >
                {/* YES overlay */}
                <motion.div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
                    opacity: yesOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--neon-green)',
                    boxShadow: '0 0 24px rgba(0,255,136,0.4), inset 0 0 24px rgba(0,255,136,0.03)',
                }}>
                    <span style={{
                        padding: '6px 16px', border: '1px solid var(--neon-green)',
                        background: 'rgba(0,255,136,0.12)', fontSize: 18, letterSpacing: 6,
                        color: 'var(--neon-green)', textShadow: '0 0 10px var(--neon-green)',
                        transform: 'rotate(-4deg)',
                    }}>YES</span>
                </motion.div>

                {/* NO overlay */}
                <motion.div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
                    opacity: noOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--neon-red)',
                    boxShadow: '0 0 24px rgba(255,34,68,0.4), inset 0 0 24px rgba(255,34,68,0.03)',
                }}>
                    <span style={{
                        padding: '6px 16px', border: '1px solid var(--neon-red)',
                        background: 'rgba(255,34,68,0.12)', fontSize: 18, letterSpacing: 6,
                        color: 'var(--neon-red)', textShadow: '0 0 10px var(--neon-red)',
                        transform: 'rotate(4deg)',
                    }}>NO</span>
                </motion.div>

                {/* Card content */}
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span className={`badge ${CATEGORY_COLORS[market.category]}`}>
                            {CATEGORY_ICONS[market.category]} {market.category}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={10} style={{ color: 'var(--neon-amber)' }} />
                            <span style={{ fontSize: 10, color: 'var(--neon-amber)', letterSpacing: 1 }}>{timeLeft}</span>
                        </div>
                    </div>

                    <h2 style={{
                        fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 14,
                        borderLeft: '2px solid var(--neon-green)', paddingLeft: 10,
                        boxShadow: '-4px 0 10px rgba(0,255,136,0.12)',
                    }}>{market.question}</h2>

                    <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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

                    {market.aiConfidence > 0 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', padding: '5px 8px', marginBottom: 12,
                            background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.08)',
                        }}>
                            <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>AI CONFIDENCE</span>
                            <span style={{
                                fontSize: 9, letterSpacing: 1,
                                color: market.aiConfidence > 60 ? 'var(--neon-green)' : market.aiConfidence < 40 ? 'var(--neon-red)' : 'var(--neon-amber)',
                            }}>{market.aiConfidence}% YES</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={10} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{market.betCount} bets</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={10} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>
                                {(market.yesPool + market.noPool).toFixed(3)} ETH
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => onBet(market, 'no')}
                            style={{
                                flex: 1, padding: '11px 0', fontSize: 10, letterSpacing: 3,
                                border: '1px solid rgba(255,34,68,0.45)', background: 'rgba(255,34,68,0.07)',
                                color: 'var(--neon-red)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            <X size={11} /> NO
                        </button>
                        <button
                            onClick={() => onBet(market, 'yes')}
                            style={{
                                flex: 1, padding: '11px 0', fontSize: 10, letterSpacing: 3,
                                border: '1px solid rgba(0,255,136,0.45)', background: 'rgba(0,255,136,0.07)',
                                color: 'var(--neon-green)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            <Check size={11} /> YES
                        </button>
                    </div>
                </div>
            </motion.div>

            <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginTop: 8, letterSpacing: 2, opacity: 0.6 }}>
                SWIPE RIGHT = YES / LEFT = NO
            </p>
        </div>
    )
}

export default function TradePage() {
    const router = useRouter()
    const { isInWorldApp, placeBet } = useMiniKit()
    const { markets, isLoading: marketsLoading, onChainCount } = useMarkets()
    const [showConfirm, setShowConfirm] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null)
    const [isBetting, setIsBetting] = useState(false)
    const [betError, setBetError] = useState<string | null>(null)
    const [successIds, setSuccessIds] = useState<Set<number>>(new Set())

    const haptic = useHaptic()

    const handleBet = useCallback((market: Market, side: 'yes' | 'no') => {
        haptic('light')
        setBetError(null)
        setShowConfirm({ market, side })
    }, [haptic])

    const confirmBet = useCallback(async () => {
        if (!showConfirm || isBetting) return
        setBetError(null)
        setIsBetting(true)
        try {
            const betAmount = Math.min(0.001, showConfirm.market.maxBetPerPerson)
            await placeBet(showConfirm.market.id, showConfirm.side === 'yes', betAmount)
            haptic('success')
            const id = showConfirm.market.id
            setSuccessIds(prev => new Set([...prev, id]))
            setShowConfirm(null)
            setTimeout(() => setSuccessIds(prev => { const n = new Set(prev); n.delete(id); return n }), 4000)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Transaction failed'
            if (msg === 'rejected') {
                setBetError('Cancelled')
            } else if (msg.includes('insufficient') || msg.includes('balance')) {
                setBetError('Need testnet ETH — get from World Chain Sepolia faucet')
            } else {
                setBetError(msg)
            }
            haptic('error')
        } finally {
            setIsBetting(false)
        }
    }, [showConfirm, isBetting, placeBet, haptic])

    // ─── Loading ───
    if (marketsLoading) {
        return (
            <div style={{ minHeight: '100svh', background: 'var(--bg)', fontFamily: 'var(--font-retro)', display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-dim)', background: 'var(--bg)' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <ArrowLeft size={16} style={{ color: 'var(--text-dim)' }} />
                    </button>
                    <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>MARKETS</span>
                </header>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <Loader2 size={24} style={{ color: 'var(--neon-green)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 3 }}>LOADING MARKETS...</p>
                    <p style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 2, opacity: 0.6 }}>READING ON-CHAIN DATA</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100svh', background: 'var(--bg)', fontFamily: 'var(--font-retro)' }}>

            {/* ─── Sticky Header ─── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 20,
                padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-dim)', background: 'rgba(5,5,8,0.95)',
                backdropFilter: 'blur(10px)',
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <ArrowLeft size={16} style={{ color: 'var(--text-dim)' }} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {onChainCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Wifi size={8} style={{ color: 'var(--neon-green)' }} />
                            <span style={{ fontSize: 7, color: 'var(--neon-green)', letterSpacing: 1 }}>LIVE</span>
                        </div>
                    )}
                    <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>
                        MARKETS ({markets.length})
                    </span>
                </div>
                <div style={{ width: 28 }} />
            </header>

            {/* ─── Scrollable Market Feed ─── */}
            <div style={{ paddingTop: 16, paddingBottom: 60, maxWidth: 480, margin: '0 auto' }}>
                {markets.length === 0 ? (
                    <div style={{ padding: '80px 16px', textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 3, marginBottom: 8 }}>NO ACTIVE MARKETS</p>
                        <p style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 2, opacity: 0.5 }}>Check back soon</p>
                    </div>
                ) : (
                    markets.map((market, i) => (
                        <div key={market.id}>
                            <MarketCard
                                market={market}
                                onBet={handleBet}
                                haptic={haptic}
                                success={successIds.has(market.id)}
                            />
                            {i < markets.length - 1 && (
                                <div style={{ height: 1, margin: '0 16px 24px', background: 'rgba(0,255,136,0.06)' }} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ─── Confirm Bottom Sheet ─── */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 50,
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => { if (!isBetting) { setShowConfirm(null); setBetError(null) } }}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            style={{
                                width: '100%', maxWidth: 480, padding: '24px 20px 48px',
                                background: 'var(--bg-card)',
                                borderTop: `1px solid ${showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                                boxShadow: showConfirm.side === 'yes'
                                    ? '0 -20px 60px rgba(0,255,136,0.12)'
                                    : '0 -20px 60px rgba(255,34,68,0.12)',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

                            <p style={{
                                fontSize: 16, letterSpacing: 4, textAlign: 'center', marginBottom: 6,
                                color: showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)',
                                textShadow: showConfirm.side === 'yes' ? '0 0 10px var(--neon-green)' : '0 0 10px var(--neon-red)',
                            }}>
                                BET {showConfirm.side.toUpperCase()}?
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', letterSpacing: 1, marginBottom: 20, lineHeight: 1.6, padding: '0 16px' }}>
                                {showConfirm.market.question}
                            </p>

                            {(() => {
                                const betAmount = Math.min(0.001, showConfirm.market.maxBetPerPerson)
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                                        {[
                                            { label: 'AMOUNT', value: `${betAmount} ETH` },
                                            {
                                                label: 'POTENTIAL PAYOUT',
                                                value: `${getPotentialPayout(betAmount, showConfirm.market, showConfirm.side === 'yes').toFixed(4)} ETH`,
                                                highlight: true,
                                            },
                                        ].map(({ label, value, highlight }) => (
                                            <div key={label} style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                background: 'rgba(0,255,136,0.025)', border: '1px solid rgba(0,255,136,0.06)',
                                            }}>
                                                <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</span>
                                                <span style={{
                                                    fontSize: 9, letterSpacing: 1,
                                                    color: highlight ? (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)') : 'var(--text-primary)',
                                                }}>{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}

                            {betError && (
                                <p style={{
                                    fontSize: 9, color: 'var(--neon-red)', textAlign: 'center',
                                    letterSpacing: 1, marginBottom: 12, lineHeight: 1.5,
                                }}>
                                    {betError === 'Cancelled' ? 'CANCELLED' : betError.slice(0, 80)}
                                </p>
                            )}

                            {isBetting && (
                                <p style={{
                                    fontSize: 9, color: 'var(--neon-green)', textAlign: 'center',
                                    letterSpacing: 1, marginBottom: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}>
                                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                    {isInWorldApp ? 'VERIFYING WORLD ID...' : 'SIGNING...'}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => { setShowConfirm(null); setBetError(null) }}
                                    disabled={isBetting}
                                    style={{
                                        flex: 1, padding: '12px 0', fontSize: 10, letterSpacing: 2,
                                        border: '1px solid var(--border-dim)', color: 'var(--text-dim)',
                                        background: 'transparent', cursor: 'pointer', opacity: isBetting ? 0.4 : 1,
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={confirmBet}
                                    disabled={isBetting}
                                    style={{
                                        flex: 2, padding: '12px 0', fontSize: 10, letterSpacing: 2, fontWeight: 700,
                                        border: `1px solid ${showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                                        background: isBetting ? 'transparent' : (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'),
                                        color: isBetting ? (showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)') : '#000',
                                        cursor: isBetting ? 'not-allowed' : 'pointer',
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
