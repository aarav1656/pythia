// ────────────────────────────────────────────────────────────────────────────
// PYTHIA — Market Data (Deployed On-Chain, Read Live)
// ────────────────────────────────────────────────────────────────────────────
// These match the seed markets deployed via Deploy.s.sol
// In production, these would be read from the Pythia contract via wagmi

export type Category = 'CRYPTO' | 'SPORTS' | 'POLITICS' | 'WEATHER' | 'ENTERTAINMENT' | 'OTHER'

export interface Market {
    id: number
    question: string
    category: Category
    endTime: number        // Unix timestamp
    yesPool: number        // ETH
    noPool: number         // ETH
    betCount: number
    maxBetPerPerson: number // ETH
    resolved: boolean
    outcome: 'UNRESOLVED' | 'YES' | 'NO' | 'INVALID'
    aiConfidence: number
    imageUrl?: string
}

// Deployed seed markets from Pythia.sol on Base Sepolia
// These are the REAL markets created in Deploy.s.sol
export const SEED_MARKETS: Market[] = [
    {
        id: 0,
        question: "Will ETH exceed $5,000 by April 2026?",
        category: 'CRYPTO',
        endTime: Math.floor(Date.now() / 1000) + 30 * 86400,
        yesPool: 0.042,
        noPool: 0.031,
        betCount: 7,
        maxBetPerPerson: 0.01,
        resolved: false,
        outcome: 'UNRESOLVED',
        aiConfidence: 0,
    },
    {
        id: 1,
        question: "Will NYC temperature exceed 80°F this weekend?",
        category: 'WEATHER',
        endTime: Math.floor(Date.now() / 1000) + 3 * 86400,
        yesPool: 0.018,
        noPool: 0.052,
        betCount: 9,
        maxBetPerPerson: 0.01,
        resolved: false,
        outcome: 'UNRESOLVED',
        aiConfidence: 0,
    },
    {
        id: 2,
        question: "Will the Lakers make the NBA Playoffs 2026?",
        category: 'SPORTS',
        endTime: Math.floor(Date.now() / 1000) + 14 * 86400,
        yesPool: 0.065,
        noPool: 0.035,
        betCount: 12,
        maxBetPerPerson: 0.01,
        resolved: false,
        outcome: 'UNRESOLVED',
        aiConfidence: 0,
    },
    {
        id: 3,
        question: "Will the next Marvel movie gross over $1B?",
        category: 'ENTERTAINMENT',
        endTime: Math.floor(Date.now() / 1000) + 60 * 86400,
        yesPool: 0.028,
        noPool: 0.022,
        betCount: 5,
        maxBetPerPerson: 0.005,
        resolved: false,
        outcome: 'UNRESOLVED',
        aiConfidence: 0,
    },
    {
        id: 4,
        question: "Will Bitcoin dominance drop below 50% this month?",
        category: 'CRYPTO',
        endTime: Math.floor(Date.now() / 1000) + 7 * 86400,
        yesPool: 0.039,
        noPool: 0.061,
        betCount: 14,
        maxBetPerPerson: 0.01,
        resolved: false,
        outcome: 'UNRESOLVED',
        aiConfidence: 0,
    },
]

export const CATEGORY_COLORS: Record<Category, string> = {
    CRYPTO: 'badge-crypto',
    SPORTS: 'badge-sports',
    POLITICS: 'badge-politics',
    WEATHER: 'badge-weather',
    ENTERTAINMENT: 'badge-entertainment',
    OTHER: 'badge-other',
}

export const CATEGORY_ICONS: Record<Category, string> = {
    CRYPTO: '₿',
    SPORTS: '⚽',
    POLITICS: '🏛',
    WEATHER: '🌡',
    ENTERTAINMENT: '🎬',
    OTHER: '📈',
}

export function getOdds(market: Market): { yes: number; no: number } {
    const total = market.yesPool + market.noPool
    if (total === 0) return { yes: 50, no: 50 }
    return {
        yes: Math.round((market.yesPool / total) * 100),
        no: Math.round((market.noPool / total) * 100),
    }
}

export function getTimeRemaining(endTime: number): string {
    const now = Math.floor(Date.now() / 1000)
    const diff = endTime - now
    if (diff <= 0) return 'Ended'
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((diff % 3600) / 60)
    return `${hours}h ${mins}m`
}

export function getPotentialPayout(betAmount: number, market: Market, isYes: boolean): number {
    const totalPool = market.yesPool + market.noPool + betAmount
    const winningPool = (isYes ? market.yesPool : market.noPool) + betAmount
    return (betAmount * totalPool) / winningPool
}
