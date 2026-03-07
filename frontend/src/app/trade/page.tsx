'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining } from '@/lib/markets'
import { useMiniKit, formatAddress } from '@/hooks/useMiniKit'
import { useMarkets } from '@/hooks/useMarkets'
import { Clock, Users, TrendingUp, X, Check, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
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

// Single card — motion values are local so they reset cleanly on re-render
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
    const totalPool = (market.yesPool + market.noPool).toFixed(3)

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
        <div style={{ width: '100%' }}>
            {success && (
                <div style={{
                    marginBottom: 10, padding: '8px 12px', textAlign: 'center',
                    background: 'rgba(0,255,136,0.08)', border: '1px solid var(--neon-green)',
                    fontSize: 9, letterSpacing: 3, color: 'var(--neon-green)',
                }}>
                    BET PLACED
                </div>
            )}

            <motion.div
                key={market.id}
                style={{
                    x, rotate,
                    border: '1px solid var(--border-dim)',
                    background: 'var(--bg-card)',
                    cursor: 'grab',
                    position: 'relative',
                    userSelect: 'none',
                    boxShadow: '0 0 24px rgba(0,255,136,0.04)',
                    touchAction: 'pan-y',
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                whileTap={{ cursor: 'grabbing' }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
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
                        fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 18,
                        borderLeft: '2px solid var(--neon-green)', paddingLeft: 10,
                        boxShadow: '-4px 0 10px rgba(0,255,136,0.12)',
                    }}>{market.question}</h2>

                    <div style={{ marginBottom: 16 }}>
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
                            display: 'flex', justifyContent: 'space-between', padding: '5px 8px', marginBottom: 14,
                            background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.08)',
                        }}>
                            <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>AI CONFIDENCE</span>
                            <span style={{
                                fontSize: 9, letterSpacing: 1,
                                color: market.aiConfidence > 60 ? 'var(--neon-green)' : market.aiConfidence < 40 ? 'var(--neon-red)' : 'var(--neon-amber)',
                            }}>{market.aiConfidence}% YES</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={10} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{market.betCount} bets</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={10} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}>{totalPool} ETH pool</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => onBet(market, 'no')}
                            style={{
                                flex: 1, padding: '12px 0', fontSize: 10, letterSpacing: 3,
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
                                flex: 1, padding: '12px 0', fontSize: 10, letterSpacing: 3,
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

            <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginTop: 10, letterSpacing: 2, opacity: 0.6 }}>
                SWIPE RIGHT = YES / LEFT = NO
            </p>
        </div>
    )
}

export default function TradePage() {
    const router = useRouter()
    const { isInWorldApp, placeBet, walletAddress } = useMiniKit()
    const { markets, isLoading: marketsLoading } = useMarkets()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showConfirm, setShowConfirm] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null)
    const [isBetting, setIsBetting] = useState(false)
    const [betError, setBetError] = useState<string | null>(null)
    const [successIds, setSuccessIds] = useState<Set<number>>(new Set())

    const haptic = useHaptic()

    const currentMarket = markets[currentIndex]

    const goNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + 1, markets.length - 1))
        setBetError(null)
    }, [markets.length])

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0))
        setBetError(null)
    }, [])

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
            // Auto-advance to next market after successful bet
            setTimeout(() => {
                setCurrentIndex(prev => Math.min(prev + 1, markets.length - 1))
                setSuccessIds(prev => { const n = new Set(prev); n.delete(id); return n })
            }, 1500)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Transaction failed'
            if (msg === 'rejected') {
                setBetError('Cancelled')
            } else if (msg.includes('insufficient') || msg.includes('balance')) {
                setBetError('Need testnet ETH — get from World Chain Sepolia faucet')
            } else if (msg.startsWith('simulation_failed')) {
                // Extract debug URL if present
                const lines = msg.split('\n')
                const url = lines[1] ?? ''
                setBetError(url ? `Simulation failed — ${url}` : 'Simulation failed — market may be closed or already bet')
            } else {
                setBetError(msg)
            }
            haptic('error')
        } finally {
            setIsBetting(false)
        }
    }, [showConfirm, isBetting, placeBet, haptic, markets.length])

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
                </div>
            </div>
        )
    }

    if (!currentMarket) {
        return (
            <div style={{ minHeight: '100svh', background: 'var(--bg)', fontFamily: 'var(--font-retro)', display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-dim)', background: 'var(--bg)' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <ArrowLeft size={16} style={{ color: 'var(--text-dim)' }} />
                    </button>
                    <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>MARKETS</span>
                </header>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 3 }}>NO MARKETS AVAILABLE</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100svh', background: 'var(--bg)', fontFamily: 'var(--font-retro)', display: 'flex', flexDirection: 'column' }}>

            {/* ─── Header ─── */}
            <header style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-dim)', background: 'var(--bg)',
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <ArrowLeft size={16} style={{ color: 'var(--text-dim)' }} />
                </button>
                <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--neon-green)', textShadow: '0 0 6px var(--neon-green)' }}>MARKETS</span>
                {walletAddress ? (
                    <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>{formatAddress(walletAddress)}</span>
                ) : (
                    <div style={{ width: 60 }} />
                )}
            </header>

            {/* ─── Card area ─── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 16px 0' }}>
                <AnimatePresence mode="wait">
                    <MarketCard
                        key={currentMarket.id}
                        market={currentMarket}
                        onBet={handleBet}
                        haptic={haptic}
                        success={successIds.has(currentMarket.id)}
                    />
                </AnimatePresence>
            </div>

            {/* ─── Navigation ─── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px 8px',
            }}>
                <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    style={{
                        background: 'none', border: '1px solid var(--border-dim)',
                        color: currentIndex === 0 ? 'var(--text-dim)' : 'var(--text-primary)',
                        cursor: currentIndex === 0 ? 'default' : 'pointer',
                        padding: '6px 12px', opacity: currentIndex === 0 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: 2,
                    }}
                >
                    <ChevronLeft size={12} /> PREV
                </button>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {markets.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setCurrentIndex(i); setBetError(null) }}
                            style={{
                                width: i === currentIndex ? 16 : 6,
                                height: 6,
                                borderRadius: 3,
                                border: 'none',
                                background: i === currentIndex ? 'var(--neon-green)' : 'var(--border-dim)',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.2s',
                                boxShadow: i === currentIndex ? '0 0 6px var(--neon-green)' : 'none',
                            }}
                        />
                    ))}
                </div>

                <button
                    onClick={goNext}
                    disabled={currentIndex === markets.length - 1}
                    style={{
                        background: 'none', border: '1px solid var(--border-dim)',
                        color: currentIndex === markets.length - 1 ? 'var(--text-dim)' : 'var(--text-primary)',
                        cursor: currentIndex === markets.length - 1 ? 'default' : 'pointer',
                        padding: '6px 12px', opacity: currentIndex === markets.length - 1 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, letterSpacing: 2,
                    }}
                >
                    NEXT <ChevronRight size={12} />
                </button>
            </div>

            {/* ─── Market counter ─── */}
            <p style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 8, letterSpacing: 2 }}>
                {currentIndex + 1} / {markets.length}
            </p>

            {/* ─── Error ─── */}
            {betError && (
                <div style={{
                    margin: '0 16px 12px', padding: '8px 12px',
                    background: 'rgba(255,34,68,0.07)', border: '1px solid rgba(255,34,68,0.3)',
                    fontSize: 9, color: 'var(--neon-red)', letterSpacing: 1,
                    wordBreak: 'break-all',
                }}>
                    {betError}
                </div>
            )}

            {/* ─── Confirm bottom sheet ─── */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => !isBetting && setShowConfirm(null)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }}
                        />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={{
                                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                                background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                                borderBottom: 'none', padding: 24,
                            }}
                        >
                            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--text-dim)', marginBottom: 10 }}>CONFIRM BET</p>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>
                                {showConfirm.market.question}
                            </p>
                            <p style={{
                                fontSize: 11, letterSpacing: 2, marginBottom: 20,
                                color: showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)',
                            }}>
                                {showConfirm.side.toUpperCase()} — 0.001 ETH
                            </p>
                            {walletAddress && (
                                <p style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 16 }}>
                                    from {formatAddress(walletAddress)}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => !isBetting && setShowConfirm(null)}
                                    disabled={isBetting}
                                    style={{
                                        flex: 1, padding: '12px 0', fontSize: 10, letterSpacing: 3,
                                        border: '1px solid var(--border-dim)', background: 'none',
                                        color: 'var(--text-dim)', cursor: 'pointer',
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={confirmBet}
                                    disabled={isBetting}
                                    style={{
                                        flex: 2, padding: '12px 0', fontSize: 10, letterSpacing: 3,
                                        border: `1px solid ${showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                                        background: showConfirm.side === 'yes' ? 'rgba(0,255,136,0.1)' : 'rgba(255,34,68,0.1)',
                                        color: showConfirm.side === 'yes' ? 'var(--neon-green)' : 'var(--neon-red)',
                                        cursor: isBetting ? 'default' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                >
                                    {isBetting ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> SIGNING...</> : `BET ${showConfirm.side.toUpperCase()}`}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
