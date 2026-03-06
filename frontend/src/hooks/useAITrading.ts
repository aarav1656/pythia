'use client'

import { useState, useEffect, useCallback } from 'react'

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

interface AgentConfig {
    id: string
    name: string
    description: string
    systemPrompt: string
    icon: string
}

const AGENT_CONFIGS: AgentConfig[] = [
    {
        id: 'prophet',
        name: 'Prophet AI',
        description: 'Analyzes news & social sentiment to predict outcomes',
        icon: '🔮',
        systemPrompt: `You are a prediction market analyst specializing in news and social sentiment analysis.
Your task is to analyze current events and predict market outcomes.
Consider: viral trends, social media sentiment, news coverage, influencer opinions.
Respond in JSON format: { "prediction": "YES|NO", "confidence": 0-100, "reasoning": "brief explanation" }`
    },
    {
        id: 'quant',
        name: 'Quant Bot',
        description: 'Uses on-chain data & market signals',
        icon: '📊',
        systemPrompt: `You are a quantitative analyst specializing in on-chain data and market signals.
Your task is to analyze blockchain data, DeFi metrics, and market trends.
Consider: TVL, trading volume, wallet movements, gas prices, DeFi activity.
Respond in JSON format: { "prediction": "YES|NO", "confidence": 0-100, "reasoning": "brief explanation" }`
    },
    {
        id: 'sentiment',
        name: 'Sentiment Scanner',
        description: 'Monitors Twitter/X for trend analysis',
        icon: '🐦',
        systemPrompt: `You are a social media sentiment analyst specializing in Twitter/X trends.
Your task is to analyze tweet volume, sentiment, and trend momentum.
Consider: hashtag usage, tweet volume, sentiment score, influencer tweets, virality.
Respond in JSON format: { "prediction": "YES|NO", "confidence": 0-100, "reasoning": "brief explanation" }`
    },
    {
        id: 'consensus',
        name: 'Consensus Hunter',
        description: 'Bets against crowd overconfidence',
        icon: '🎯',
        systemPrompt: `You are a contrarian analyst who bets against crowd overconfidence.
Your task is to identify when the market is too confident and likely wrong.
Consider: consensus level, historical accuracy, market positioning, sentiment extremes.
Respond in JSON format: { "prediction": "YES|NO", "confidence": 0-100, "reasoning": "brief explanation" }`
    }
]

interface Market {
    id: number
    question: string
    category: string
    yesOdds: number
    noOdds: number
}

interface AgentPrediction {
    agentId: string
    prediction: 'YES' | 'NO' | null
    confidence: number
    reasoning: string
    timestamp: number
}

// OpenRouter API call
async function getAgentPrediction(
    agentConfig: AgentConfig,
    market: Market,
    apiKey: string
): Promise<AgentPrediction> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-X-Title': 'Pythia AI Trading Agent',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [
                { role: 'system', content: agentConfig.systemPrompt },
                { role: 'user', content: `
Market Question: "${market.question}"
Category: ${market.category}
Current YES Odds: ${market.yesOdds}%
Current NO Odds: ${market.noOdds}%

Analyze this market and provide your prediction in JSON format.
` }
            ],
            temperature: 0.3,
            max_tokens: 500,
        })
    })

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
            agentId: agentConfig.id,
            prediction: parsed.prediction?.toUpperCase() === 'YES' ? 'YES' : 
                       parsed.prediction?.toUpperCase() === 'NO' ? 'NO' : null,
            confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
            reasoning: parsed.reasoning || '',
            timestamp: Date.now()
        }
    }

    throw new Error('Failed to parse agent response')
}

// Hook for AI trading
export function useAITrading() {
    const [isEnabled, setIsEnabled] = useState(false)
    const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
    const [predictions, setPredictions] = useState<Map<string, AgentPrediction>>(new Map())
    const [isLoading, setIsLoading] = useState(false)
    const [apiKey] = useState(OPENROUTER_API_KEY)

    const toggleAgent = useCallback((agentId: string) => {
        setActiveAgents(prev => {
            const next = new Set(prev)
            if (next.has(agentId)) {
                next.delete(agentId)
            } else {
                next.add(agentId)
            }
            return next
        })
    }, [])

    const runPrediction = useCallback(async (market: Market): Promise<AgentPrediction[]> => {
        if (!apiKey) {
            console.error('OpenRouter API key not configured')
            return []
        }

        setIsLoading(true)
        const results: AgentPrediction[] = []

        for (const agentId of activeAgents) {
            const config = AGENT_CONFIGS.find(c => c.id === agentId)
            if (!config) continue

            try {
                const prediction = await getAgentPrediction(config, market, apiKey)
                results.push(prediction)
                
                setPredictions(prev => {
                    const next = new Map(prev)
                    next.set(agentId, prediction)
                    return next
                })
            } catch (e) {
                console.error(`Agent ${agentId} failed:`, e)
            }
        }

        setIsLoading(false)
        return results
    }, [activeAgents, apiKey])

    const getAggregatedPrediction = useCallback((): 'YES' | 'NO' | null => {
        let yesScore = 0
        let noScore = 0

        predictions.forEach(p => {
            if (p.prediction === 'YES') {
                yesScore += p.confidence
            } else if (p.prediction === 'NO') {
                noScore += p.confidence
            }
        })

        if (yesScore > noScore) return 'YES'
        if (noScore > yesScore) return 'NO'
        return null
    }, [predictions])

    return {
        isEnabled,
        setIsEnabled,
        activeAgents,
        toggleAgent,
        predictions,
        runPrediction,
        isLoading,
        getAggregatedPrediction,
        agentConfigs: AGENT_CONFIGS,
    }
}

export type { AgentPrediction, Market }
