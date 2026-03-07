'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACTS, PYTHIA_ABI } from '@/lib/contracts'
import { type Market, SEED_MARKETS, type Category } from '@/lib/markets'
import { formatUnits } from 'viem'

const CATEGORY_MAP: Record<number, Category> = {
    0: 'CRYPTO',
    1: 'SPORTS',
    2: 'POLITICS',
    3: 'WEATHER',
    4: 'ENTERTAINMENT',
    5: 'OTHER',
}

const OUTCOME_MAP: Record<number, 'UNRESOLVED' | 'YES' | 'NO' | 'INVALID'> = {
    0: 'UNRESOLVED',
    1: 'YES',
    2: 'NO',
    3: 'INVALID',
}

// Jupiter Price API — get live ETH/BTC/SOL prices for AI confidence scoring
async function fetchJupiterPrices(): Promise<Record<string, number>> {
    try {
        // Wormhole-wrapped ETH on Solana, wBTC, and SOL
        const tokens = [
            'So11111111111111111111111111111111111111112',   // SOL
            '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // wETH on Solana
            '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',  // wBTC on Solana
        ]
        const resp = await fetch(
            `https://price.jup.ag/v6/price?ids=${tokens.join(',')}`,
            { signal: AbortSignal.timeout(5000) }
        )
        if (!resp.ok) return {}
        const json = await resp.json()
        return {
            SOL: json.data?.['So11111111111111111111111111111111111111112']?.price ?? 0,
            ETH: json.data?.['7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs']?.price ?? 0,
            BTC: json.data?.['9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E']?.price ?? 0,
        }
    } catch {
        return {}
    }
}

// Derive AI confidence from Jupiter prices for relevant markets
function computeAiConfidence(question: string, category: Category, prices: Record<string, number>): number {
    const q = question.toLowerCase()
    if (category === 'CRYPTO') {
        if ((q.includes('eth') || q.includes('ethereum')) && prices.ETH > 0) {
            if (q.includes('5,000') || q.includes('5000')) return prices.ETH > 3500 ? 62 : 38
            if (q.includes('dominance') || q.includes('bitcoin') || q.includes('btc')) {
                return prices.BTC > 80000 ? 45 : 55
            }
            return prices.ETH > 3000 ? 60 : 40
        }
        if ((q.includes('btc') || q.includes('bitcoin')) && prices.BTC > 0) {
            return prices.BTC > 80000 ? 68 : 42
        }
        if ((q.includes('sol') || q.includes('solana')) && prices.SOL > 0) {
            return prices.SOL > 150 ? 72 : 48
        }
    }
    return 50 // default neutral confidence
}

export function useMarkets() {
    const [jupiterPrices, setJupiterPrices] = useState<Record<string, number>>({})
    const [jupiterLoading, setJupiterLoading] = useState(true)

    // Fetch Jupiter prices on mount
    useEffect(() => {
        fetchJupiterPrices().then(prices => {
            setJupiterPrices(prices)
            setJupiterLoading(false)
        })
    }, [])

    // Read active market IDs from contract
    const { data: activeIds, isLoading: idsLoading } = useReadContract({
        address: CONTRACTS.pythia,
        abi: PYTHIA_ABI,
        functionName: 'getActiveMarketIds',
    })

    // Batch-fetch each market
    const marketContracts = ((activeIds ?? []) as bigint[]).map(id => ({
        address: CONTRACTS.pythia as `0x${string}`,
        abi: PYTHIA_ABI,
        functionName: 'getMarket' as const,
        args: [id] as [bigint],
    }))

    const { data: marketResults, isLoading: marketsLoading } = useReadContracts({
        contracts: marketContracts,
        query: { enabled: !!activeIds && (activeIds as bigint[]).length > 0 },
    })

    // Parse contract results into Market[]
    const onChainMarkets: Market[] = []
    if (marketResults) {
        for (const result of marketResults) {
            if (result.status === 'success' && result.result) {
                const m = result.result as {
                    id: bigint
                    question: string
                    category: number
                    endTime: bigint
                    yesPool: bigint
                    noPool: bigint
                    betCount: bigint
                    maxBetPerPerson: bigint
                    outcome: number
                    resolved: boolean
                    aiConfidence: number
                }
                const category = CATEGORY_MAP[Number(m.category)] ?? 'OTHER'
                const aiConfidence = computeAiConfidence(m.question, category, jupiterPrices) ?? Number(m.aiConfidence)

                onChainMarkets.push({
                    id: Number(m.id),
                    question: m.question,
                    category,
                    endTime: Number(m.endTime),
                    yesPool: parseFloat(formatUnits(m.yesPool, 18)),
                    noPool: parseFloat(formatUnits(m.noPool, 18)),
                    betCount: Number(m.betCount),
                    maxBetPerPerson: parseFloat(formatUnits(m.maxBetPerPerson, 18)),
                    resolved: m.resolved,
                    outcome: OUTCOME_MAP[Number(m.outcome)] ?? 'UNRESOLVED',
                    aiConfidence,
                })
            }
        }
    }

    const isLoading = idsLoading || marketsLoading || jupiterLoading
    // Use on-chain markets if available, else fall back to seed markets (with Jupiter-enriched confidence)
    const markets = onChainMarkets.length > 0
        ? onChainMarkets
        : SEED_MARKETS.map(m => ({
            ...m,
            aiConfidence: computeAiConfidence(m.question, m.category, jupiterPrices),
        }))

    return { markets, isLoading, jupiterPrices, onChainCount: onChainMarkets.length }
}

// Hook: returns Set of marketIds where the given address has already bet
export function useUserBets(marketIds: number[], userAddress: string | null | undefined): Set<number> {
    const contracts = (userAddress && marketIds.length > 0)
        ? marketIds.map(id => ({
            address: CONTRACTS.pythia as `0x${string}`,
            abi: PYTHIA_ABI,
            functionName: 'userHasBet' as const,
            args: [BigInt(id), userAddress as `0x${string}`] as [bigint, `0x${string}`],
        }))
        : []

    const { data } = useReadContracts({
        contracts,
        query: { enabled: !!userAddress && marketIds.length > 0 },
    })

    const alreadyBet = new Set<number>()
    if (data) {
        data.forEach((result, i) => {
            if (result.status === 'success' && result.result === true) {
                alreadyBet.add(marketIds[i])
            }
        })
    }
    return alreadyBet
}

// Hook for reading on-chain global stats
export function useContractStats() {
    const { data, isLoading } = useReadContract({
        address: CONTRACTS.pythia,
        abi: PYTHIA_ABI,
        functionName: 'getStats',
    })

    if (!data) return { marketCount: 0, totalVolume: '0.00', totalBets: 0, isLoading }

    const [_marketCount, _totalVolume, _totalBets] = data as [bigint, bigint, bigint, bigint]
    return {
        marketCount: Number(_marketCount),
        totalVolume: parseFloat(formatUnits(_totalVolume, 18)).toFixed(3),
        totalBets: Number(_totalBets),
        isLoading,
    }
}
