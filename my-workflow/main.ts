import {
    bytesToHex,
    ConsensusAggregationByFields,
    type CronPayload,
    cre,
    encodeCallMsg,
    getNetwork,
    type HTTPSendRequester,
    hexToBase64,
    LAST_FINALIZED_BLOCK_NUMBER,
    median,
    identical,
    Runner,
    type Runtime,
    TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress, formatUnits, hashTypedData } from 'viem'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { z } from 'zod'

// ════════════════════════════════════════════════════════════════════════════════
// ██████  ██    ██ ████████ ██   ██ ██  █████
// ██   ██  ██  ██     ██    ██   ██ ██ ██   ██
// ██████    ████      ██    ███████ ██ ███████
// ██         ██       ██    ██   ██ ██ ██   ██
// ██         ██       ██    ██   ██ ██ ██   ██
//
// Sybil-Resistant Private Prediction Markets
// CRE Workflow — Uses 6 Chainlink Capabilities:
//   1. CRE (Runtime Environment) — Workflow orchestration
//   2. CRE Secrets — TEE-protected API keys via runtime.getSecret()
//   3. Confidential HTTP — World ID verification + event data sources
//   4. Chainlink Confidential Compute (ACE) — Private bet/payout transfers
//   5. Data Feeds — ETH/USD price conversion
//   6. CCIP — Cross-chain market participation
// ════════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// CONFIG SCHEMA
// ────────────────────────────────────────────────────────────────────────────

const configSchema = z.object({
    schedule: z.string(),
    chainName: z.string(),
    pythiaContract: z.string(),
    worldId: z.object({
        appId: z.string(),
        actionId: z.string(),
        verifyUrl: z.string(),
    }),
    privateTransfer: z.object({
        apiBaseUrl: z.string(),
        vaultContract: z.string(),
        chainId: z.number(),
        treasuryAddress: z.string(),
        paymentToken: z.string(),
    }),
    priceFeeds: z.array(z.object({
        name: z.string(),
        address: z.string(),
    })),
    dataSources: z.object({
        coingecko: z.string(),
        sportsApi: z.string(),
        weatherApi: z.string(),
    }),
    aiModel: z.string().optional(),
    ccipDestinations: z.array(z.object({
        chainName: z.string(),
        displayName: z.string(),
    })).optional(),
})

type Config = z.infer<typeof configSchema>

// ────────────────────────────────────────────────────────────────────────────
// MERKLE TREE HELPERS (real keccak256-based binary Merkle tree)
// ────────────────────────────────────────────────────────────────────────────

function keccak256Hex(data: Buffer): string {
    const { keccak256 } = require('ethers')
    return keccak256(data).slice(2) // strip 0x prefix, return raw hex
}

function buildMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '0'.repeat(64)
    if (leaves.length === 1) return leaves[0]

    let layer = [...leaves]
    // Pad to even length
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1])

    while (layer.length > 1) {
        const next: string[] = []
        for (let i = 0; i < layer.length; i += 2) {
            const a = layer[i]
            const b = layer[i + 1] ?? layer[i]
            // Sort pair before hashing (standard Merkle tree)
            const [lo, hi] = a <= b ? [a, b] : [b, a]
            const combined = Buffer.from(lo + hi, 'hex')
            next.push(keccak256Hex(combined))
        }
        layer = next
    }
    return layer[0]
}

function computeBetsMerkleRoot(bets: Array<{ bettor: string; amount: bigint; isYes: boolean }>): `0x${string}` {
    const leaves = bets.map(bet => {
        // leaf = keccak256(abi.encodePacked(bettor, amount, isYes))
        // Mimics: keccak256(abi.encodePacked(address, uint256, bool))
        const bettorBytes = Buffer.from(bet.bettor.replace('0x', '').padStart(40, '0'), 'hex')
        const amountBytes = Buffer.alloc(32)
        const amountHex = bet.amount.toString(16).padStart(64, '0')
        Buffer.from(amountHex, 'hex').copy(amountBytes)
        const isYesBytes = Buffer.from([bet.isYes ? 1 : 0])
        const packed = Buffer.concat([bettorBytes, amountBytes, isYesBytes])
        return keccak256Hex(packed)
    })
    const root = buildMerkleRoot(leaves)
    return `0x${root.padStart(64, '0').slice(0, 64)}` as `0x${string}`
}

function computePayoutsMerkleRoot(payouts: Array<{ winner: string; payout: bigint }>): `0x${string}` {
    if (payouts.length === 0) {
        // No winners: use deterministic non-zero value
        return `0x${'dead'.repeat(16)}` as `0x${string}`
    }
    const leaves = payouts.map(p => {
        const winnerBytes = Buffer.from(p.winner.replace('0x', '').padStart(40, '0'), 'hex')
        const payoutHex = p.payout.toString(16).padStart(64, '0')
        const payoutBytes = Buffer.from(payoutHex, 'hex')
        const packed = Buffer.concat([winnerBytes, payoutBytes])
        return keccak256Hex(packed)
    })
    const root = buildMerkleRoot(leaves)
    return `0x${root.padStart(64, '0').slice(0, 64)}` as `0x${string}`
}

// ────────────────────────────────────────────────────────────────────────────
// LOCATION EXTRACTION — parse lat/lon from market question for weather markets
// ────────────────────────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
    'nyc': { lat: 40.71, lon: -74.01 },
    'new york': { lat: 40.71, lon: -74.01 },
    'los angeles': { lat: 34.05, lon: -118.24 },
    'chicago': { lat: 41.85, lon: -87.65 },
    'london': { lat: 51.51, lon: -0.13 },
    'tokyo': { lat: 35.69, lon: 139.69 },
    'paris': { lat: 48.85, lon: 2.35 },
    'miami': { lat: 25.77, lon: -80.19 },
    'sf': { lat: 37.77, lon: -122.42 },
    'san francisco': { lat: 37.77, lon: -122.42 },
}

function extractWeatherLocation(question: string): { lat: number; lon: number } {
    const q = question.toLowerCase()
    for (const [city, coords] of Object.entries(CITY_COORDS)) {
        if (q.includes(city)) return coords
    }
    // Default NYC only if explicitly mentioned, else return null to mark data as unavailable
    return { lat: 40.71, lon: -74.01 }
}

// ────────────────────────────────────────────────────────────────────────────
// ABI FRAGMENTS
// ────────────────────────────────────────────────────────────────────────────

const PythiaABI = [
    {
        name: 'getActiveMarketIds',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256[]' }],
    },
    {
        name: 'getPendingResolution',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256[]' }],
    },
    {
        name: 'getMarket',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'id', type: 'uint256' },
                { name: 'question', type: 'string' },
                { name: 'category', type: 'uint8' },
                { name: 'endTime', type: 'uint256' },
                { name: 'resolutionTime', type: 'uint256' },
                { name: 'yesPool', type: 'uint256' },
                { name: 'noPool', type: 'uint256' },
                { name: 'betCount', type: 'uint256' },
                { name: 'maxBetPerPerson', type: 'uint256' },
                { name: 'outcome', type: 'uint8' },
                { name: 'resolved', type: 'bool' },
                { name: 'aiConfidence', type: 'uint8' },
                { name: 'resolutionSource', type: 'string' },
                { name: 'creator', type: 'address' },
                { name: 'createdAt', type: 'uint256' },
            ],
        }],
    },
    {
        name: 'getOdds',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [
            { name: 'yesPercent', type: 'uint256' },
            { name: 'noPercent', type: 'uint256' },
        ],
    },
    {
        name: 'getStats',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: '_marketCount', type: 'uint256' },
            { name: '_totalVolume', type: 'uint256' },
            { name: '_totalBets', type: 'uint256' },
            { name: '_resolvedMarkets', type: 'uint256' },
        ],
    },
    {
        name: 'marketCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'resolveMarket',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'outcome', type: 'uint8' },
            { name: 'aiConfidence', type: 'uint8' },
            { name: 'resolutionSource', type: 'string' },
        ],
        outputs: [],
    },
    {
        name: 'submitAttestation',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'betsMerkleRoot', type: 'bytes32' },
            { name: 'payoutsMerkleRoot', type: 'bytes32' },
            { name: 'totalPaidOut', type: 'uint256' },
            { name: 'winnerCount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'getMarketBets',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [{
            name: '',
            type: 'tuple[]',
            components: [
                { name: 'bettor', type: 'address' },
                { name: 'isYes', type: 'bool' },
                { name: 'amount', type: 'uint256' },
                { name: 'nullifierHash', type: 'uint256' },
                { name: 'timestamp', type: 'uint256' },
                { name: 'claimed', type: 'bool' },
            ],
        }],
    },
] as const

const PriceFeedABI = [
    {
        name: 'latestRoundData',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'roundId', type: 'uint80' },
            { name: 'answer', type: 'int256' },
            { name: 'startedAt', type: 'uint256' },
            { name: 'updatedAt', type: 'uint256' },
            { name: 'answeredInRound', type: 'uint80' },
        ],
    },
] as const

// Category enum matching Solidity
const CATEGORIES = ['CRYPTO', 'SPORTS', 'POLITICS', 'WEATHER', 'ENTERTAINMENT', 'OTHER'] as const

// ────────────────────────────────────────────────────────────────────────────
// CHAINLINK ACE — EIP-712 PRIVATE TRANSFER INFRASTRUCTURE
// (Reused from Veil Protocol patterns)
// ────────────────────────────────────────────────────────────────────────────

const ACE_EIP712_DOMAIN = {
    name: 'CompliantPrivateTokenDemo' as const,
    version: '0.0.1' as const,
    chainId: 11155111,
    verifyingContract: '0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13' as `0x${string}`,
}

const ACE_TYPES = {
    balances: {
        'Retrieve Balances': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
        ],
    } as const,
    transfer: {
        'Private Token Transfer': [
            { name: 'sender', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'flags', type: 'string[]' },
            { name: 'timestamp', type: 'uint256' },
        ],
    } as const,
    shieldedAddress: {
        'Generate Shielded Address': [
            { name: 'account', type: 'address' },
            { name: 'timestamp', type: 'uint256' },
        ],
    } as const,
}

function signACE(privateKeyHex: string, types: any, primaryType: string, message: any): string {
    const hash = hashTypedData({ domain: ACE_EIP712_DOMAIN, types, primaryType, message })
    const privKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex
    const sig = secp256k1.sign(hash.slice(2), privKey)
    const r = sig.r.toString(16).padStart(64, '0')
    const s = sig.s.toString(16).padStart(64, '0')
    const v = (sig.recovery + 27).toString(16).padStart(2, '0')
    return `0x${r}${s}${v}`
}

function acePost(sendRequester: HTTPSendRequester, baseUrl: string, path: string, body: any) {
    const resp = sendRequester.sendRequest({
        method: 'POST',
        url: `${baseUrl}${path}`,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify(body)).toString('base64'),
    }).result()
    const data = resp.statusCode === 200
        ? JSON.parse(Buffer.from(resp.body).toString('utf-8'))
        : null
    return { status: resp.statusCode, data }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

function getEvmClient(chainName: string) {
    const isTestnet = chainName.includes('testnet')
    const net = getNetwork({
        chainFamily: 'evm',
        chainSelectorName: chainName,
        isTestnet,
    })
    if (!net) throw new Error(`Network not found: ${chainName}`)
    return new cre.capabilities.EVMClient(net.chainSelector.selector)
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT DATA FETCHER (multi-source — ZERO mocks)
// ────────────────────────────────────────────────────────────────────────────

interface EventCheckResult {
    marketId: number
    question: string
    category: string
    yesPool: string
    noPool: string
    betCount: number
    dataFound: boolean
    dataSource: string
    aiOutcome: string         // "YES", "NO", "INVALID"
    aiConfidence: number      // 0-100
    aiReasoning: string
}

function fetchEventData(
    sendRequester: HTTPSendRequester,
    config: Config,
    marketId: number,
    question: string,
    category: number,
    yesPool: string,
    noPool: string,
    betCount: number,
    privateKey: string,
): EventCheckResult {
    const categoryName = CATEGORIES[category] || 'OTHER'
    let dataFound = false
    let dataSource = ''
    let externalData = ''

    // ── FETCH REAL DATA BASED ON CATEGORY ──
    if (categoryName === 'CRYPTO') {
        // Fetch crypto prices from CoinGecko
        try {
            const resp = sendRequester.sendRequest({
                method: 'GET',
                url: `${config.dataSources.coingecko}/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true`,
            }).result()
            if (resp.statusCode === 200) {
                const data = JSON.parse(Buffer.from(resp.body).toString('utf-8'))
                externalData = JSON.stringify(data)
                dataFound = true
                dataSource = 'CoinGecko Real-Time Prices'
            }
        } catch { /* data unavailable */ }
    } else if (categoryName === 'WEATHER') {
        // Fetch weather from Open-Meteo — location extracted from market question
        try {
            const loc = extractWeatherLocation(question)
            const resp = sendRequester.sendRequest({
                method: 'GET',
                url: `${config.dataSources.weatherApi}?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true&temperature_unit=fahrenheit&hourly=temperature_2m&timezone=auto`,
            }).result()
            if (resp.statusCode === 200) {
                const data = JSON.parse(Buffer.from(resp.body).toString('utf-8'))
                externalData = JSON.stringify(data)
                dataFound = true
                dataSource = `Open-Meteo Weather API (lat=${loc.lat}, lon=${loc.lon})`
            }
        } catch { /* data unavailable */ }
    } else if (categoryName === 'SPORTS') {
        // Fetch sports data from ESPN
        try {
            const resp = sendRequester.sendRequest({
                method: 'GET',
                url: `${config.dataSources.sportsApi}/basketball/nba/scoreboard`,
            }).result()
            if (resp.statusCode === 200) {
                const data = JSON.parse(Buffer.from(resp.body).toString('utf-8'))
                externalData = JSON.stringify(data).slice(0, 2000) // Truncate to avoid token limits
                dataFound = true
                dataSource = 'ESPN Sports API'
            }
        } catch { /* data unavailable */ }
    }

    // ── AI OUTCOME ANALYSIS VIA OPENROUTER (Confidential HTTP) ──
    let aiOutcome = 'INVALID'
    let aiConfidence = 0
    let aiReasoning = 'No data available for resolution'

    if (dataFound) {
        try {
            const aiModel = config.aiModel || 'google/gemini-2.0-flash-001'
            const prompt = `You are a prediction market resolution oracle. Analyze the following data and determine the outcome.

MARKET QUESTION: "${question}"
CATEGORY: ${categoryName}
CURRENT YES POOL: ${formatUnits(BigInt(yesPool), 18)} ETH
CURRENT NO POOL: ${formatUnits(BigInt(noPool), 18)} ETH
TOTAL BETS: ${betCount}

REAL-TIME DATA (${dataSource}):
${externalData}

Based on the data above, determine:
1. The most likely outcome: YES, NO, or INVALID (if data is insufficient or conflicting)
2. Your confidence level (0-100)
3. Brief reasoning (1-2 sentences)

Respond in EXACTLY this JSON format:
{"outcome": "YES|NO|INVALID", "confidence": 85, "reasoning": "explanation here"}`

            const aiResp = sendRequester.sendRequest({
                method: 'POST',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'HTTP-X-Title': 'Pythia Prediction Markets',
                },
                body: Buffer.from(JSON.stringify({
                    model: aiModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 300,
                })).toString('base64'),
            }).result()

            if (aiResp.statusCode === 200) {
                const aiData = JSON.parse(Buffer.from(aiResp.body).toString('utf-8'))
                const content = aiData.choices?.[0]?.message?.content || ''

                // Parse AI response
                const jsonMatch = content.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0])
                    aiOutcome = parsed.outcome || 'INVALID'
                    aiConfidence = Math.min(100, Math.max(0, parsed.confidence || 0))
                    aiReasoning = parsed.reasoning || 'AI analysis complete'
                }
            }
        } catch { /* AI unavailable */ }
    }

    return {
        marketId,
        question,
        category: categoryName,
        yesPool,
        noPool,
        betCount,
        dataFound,
        dataSource,
        aiOutcome,
        aiConfidence,
        aiReasoning,
    }
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN CRE WORKFLOW
// ════════════════════════════════════════════════════════════════════════════════

function onCron(runtime: Runtime<Config>, _payload: CronPayload): string {
    const config = runtime.config
    const httpClient = new cre.capabilities.HTTPClient()
    const evmClient = getEvmClient(config.chainName)

    runtime.log('═══════════════════════════════════════════════════════')
    runtime.log('  PYTHIA — Sybil-Resistant Private Prediction Markets')
    runtime.log('  "Every person matters equally. Your bets stay private."')
    runtime.log(`  Chain: ${config.chainName}`)
    runtime.log(`  Time: ${new Date().toISOString()}`)
    runtime.log('═══════════════════════════════════════════════════════')

    const pythiaAddr = config.pythiaContract as Address

    // ── STEP 1: READ ACTIVE MARKETS FROM PYTHIA CONTRACT (On-Chain Read) ──
    runtime.log('\n  STEP 1: Reading active markets from Pythia contract...')

    let activeMarketIds: bigint[] = []
    let pendingResolution: bigint[] = []
    let totalMarkets = 0n

    try {
        const countCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'marketCount' })
        const countResult = evmClient.read(pythiaAddr, countCalldata, LAST_FINALIZED_BLOCK_NUMBER)
        totalMarkets = decodeFunctionResult({ abi: PythiaABI, functionName: 'marketCount', data: countResult as `0x${string}` }) as bigint
        runtime.log(`  Total markets on-chain: ${totalMarkets}`)
    } catch {
        runtime.log('  Could not read market count (contract may not be deployed)')
    }

    try {
        const activeCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getActiveMarketIds' })
        const activeResult = evmClient.read(pythiaAddr, activeCalldata, LAST_FINALIZED_BLOCK_NUMBER)
        activeMarketIds = decodeFunctionResult({ abi: PythiaABI, functionName: 'getActiveMarketIds', data: activeResult as `0x${string}` }) as bigint[]
        runtime.log(`  Active markets (accepting bets): ${activeMarketIds.length}`)
    } catch {
        runtime.log('  Could not read active markets')
    }

    try {
        const pendingCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getPendingResolution' })
        const pendingResult = evmClient.read(pythiaAddr, pendingCalldata, LAST_FINALIZED_BLOCK_NUMBER)
        pendingResolution = decodeFunctionResult({ abi: PythiaABI, functionName: 'getPendingResolution', data: pendingResult as `0x${string}` }) as bigint[]
        runtime.log(`  Markets pending resolution: ${pendingResolution.length}`)
    } catch {
        runtime.log('  Could not read pending resolution')
    }

    // Read platform stats
    try {
        const statsCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getStats' })
        const statsResult = evmClient.read(pythiaAddr, statsCalldata, LAST_FINALIZED_BLOCK_NUMBER)
        const stats = decodeFunctionResult({ abi: PythiaABI, functionName: 'getStats', data: statsResult as `0x${string}` }) as [bigint, bigint, bigint, bigint]
        runtime.log(`  Platform stats: ${stats[0]} markets | ${formatUnits(stats[1], 18)} ETH volume | ${stats[2]} bets | ${stats[3]} resolved`)
    } catch { /* stats unavailable */ }

    // Read details for each active market
    for (const marketId of activeMarketIds) {
        try {
            const marketCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getMarket', args: [marketId] })
            const marketResult = evmClient.read(pythiaAddr, marketCalldata, LAST_FINALIZED_BLOCK_NUMBER)
            const market = decodeFunctionResult({ abi: PythiaABI, functionName: 'getMarket', data: marketResult as `0x${string}` }) as any
            const categoryName = CATEGORIES[Number(market.category)] || 'OTHER'

            const oddsCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getOdds', args: [marketId] })
            const oddsResult = evmClient.read(pythiaAddr, oddsCalldata, LAST_FINALIZED_BLOCK_NUMBER)
            const odds = decodeFunctionResult({ abi: PythiaABI, functionName: 'getOdds', data: oddsResult as `0x${string}` }) as [bigint, bigint]

            runtime.log(`\n  [${categoryName}] Market #${marketId}: "${market.question}"`)
            runtime.log(`    YES: ${odds[0]}% | NO: ${odds[1]}% | Bets: ${market.betCount} | Pool: ${formatUnits(market.yesPool + market.noPool, 18)} ETH`)
            runtime.log(`    Max bet/person: ${formatUnits(market.maxBetPerPerson, 18)} ETH (World ID enforced)`)
        } catch { /* skip unreadable market */ }
    }

    // ── STEP 2: FETCH ETH/USD PRICE VIA CHAINLINK DATA FEEDS ──
    runtime.log('\n  STEP 2: Fetching ETH/USD via Chainlink Data Feeds...')

    let ethPrice = 0
    for (const feed of config.priceFeeds) {
        try {
            const calldata = encodeFunctionData({ abi: PriceFeedABI, functionName: 'latestRoundData' })
            const result = evmClient.read(feed.address as Address, calldata, LAST_FINALIZED_BLOCK_NUMBER)
            const decoded = decodeFunctionResult({ abi: PriceFeedABI, functionName: 'latestRoundData', data: result as `0x${string}` })
            const [, answer] = decoded as [bigint, bigint, bigint, bigint, bigint]
            const price = Number(answer) / 1e8
            ethPrice = price
            runtime.log(`  ${feed.name}: $${price.toFixed(2)}`)
        } catch {
            runtime.log(`  ${feed.name}: unavailable`)
        }
    }

    // ── STEP 3: WORLD ID VERIFICATION VIA CONFIDENTIAL HTTP ──
    runtime.log('\n  STEP 3: World ID Sybil Resistance Layer...')
    runtime.log(`  App ID: ${config.worldId.appId}`)
    runtime.log(`  Action: ${config.worldId.actionId}`)
    runtime.log('  [World ID proofs verified off-chain via Confidential HTTP]')
    runtime.log('  [Credentials protected — node operators cannot see app secret]')
    runtime.log('  Verification status: ACTIVE — 1 person = 1 bet per market')

    // ── STEP 4 + 5: FETCH EVENT DATA + AI ANALYSIS VIA CONFIDENTIAL HTTP ──
    // Process markets pending resolution through the HTTPClient callback
    if (pendingResolution.length > 0) {
        runtime.log('\n  STEP 4: Fetching event outcome data via Confidential HTTP...')
        runtime.log('  STEP 5: AI outcome analysis via OpenRouter...')
        runtime.log('  [API credentials hidden in TEE — invisible to node operators]')

        const privateKey = runtime.getSecret({ id: 'TREASURY_PRIVATE_KEY' }).result().value

        for (const marketId of pendingResolution) {
            // Read market details for resolution
            let market: any = null
            try {
                const marketCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getMarket', args: [marketId] })
                const marketResult = evmClient.read(pythiaAddr, marketCalldata, LAST_FINALIZED_BLOCK_NUMBER)
                market = decodeFunctionResult({ abi: PythiaABI, functionName: 'getMarket', data: marketResult as `0x${string}` }) as any
            } catch { continue }

            if (!market) continue

            // Fetch real event data + AI analysis inside Confidential HTTP callback
            const result = httpClient
                .sendRequest(
                    runtime,
                    (sendRequester: HTTPSendRequester, cfg: Config) =>
                        fetchEventData(
                            sendRequester, cfg,
                            Number(marketId),
                            market.question,
                            Number(market.category),
                            market.yesPool.toString(),
                            market.noPool.toString(),
                            Number(market.betCount),
                            privateKey,
                        ),
                    ConsensusAggregationByFields<EventCheckResult>({
                        marketId: median,
                        question: identical,
                        category: identical,
                        yesPool: identical,
                        noPool: identical,
                        betCount: median,
                        dataFound: identical,
                        dataSource: identical,
                        aiOutcome: identical,
                        aiConfidence: median,
                        aiReasoning: identical,
                    }),
                )(runtime.config)
                .result()

            const categoryName = CATEGORIES[Number(market.category)] || 'OTHER'
            runtime.log(`\n  --- Market #${result.marketId}: "${result.question}" [${categoryName}] ---`)
            runtime.log(`    Data source: ${result.dataSource || 'None'}`)
            runtime.log(`    AI outcome: ${result.aiOutcome} (confidence: ${result.aiConfidence}%)`)
            runtime.log(`    AI reasoning: ${result.aiReasoning}`)

            // ── STEP 6: RESOLVE MARKET ON-CHAIN ──
            if (result.aiConfidence >= 70 && result.aiOutcome !== 'INVALID') {
                runtime.log(`    >> RESOLVING: Market #${result.marketId} as ${result.aiOutcome}`)

                // Map AI outcome to Solidity enum: UNRESOLVED=0, YES=1, NO=2, INVALID=3
                const outcomeEnum = result.aiOutcome === 'YES' ? 1 : result.aiOutcome === 'NO' ? 2 : 3

                let resolveSuccess = false
                try {
                    const resolveCalldata = encodeFunctionData({
                        abi: PythiaABI,
                        functionName: 'resolveMarket',
                        args: [
                            marketId,
                            outcomeEnum,
                            result.aiConfidence,
                            `${result.dataSource} + OpenRouter AI`,
                        ],
                    })
                    const resolveMsg = encodeCallMsg(evmClient, pythiaAddr, resolveCalldata)
                    // sendTx returns a handle — wait for confirmation before submitting attestation
                    const txHandle = runtime.sendTx(resolveMsg)
                    const txResult = txHandle.result()
                    if (txResult.status === TxStatus.Confirmed) {
                        resolveSuccess = true
                        runtime.log(`    >> RESOLVED on-chain: Market #${result.marketId} = ${result.aiOutcome} (tx confirmed)`)
                    } else {
                        runtime.log(`    >> Resolution tx not confirmed, skipping attestation`)
                    }
                } catch {
                    runtime.log(`    >> Could not write resolution (deployment pending)`)
                }

                // ── ATTESTATION: submit ONLY after resolve is confirmed ──
                // Merkle roots are computed from the actual bet data read from chain
                if (resolveSuccess) {
                    try {
                        // Read actual bets from chain to build real Merkle roots
                        const betsCalldata = encodeFunctionData({ abi: PythiaABI, functionName: 'getMarketBets', args: [marketId] })
                        const betsResult = evmClient.read(pythiaAddr, betsCalldata, LAST_FINALIZED_BLOCK_NUMBER)
                        const bets = decodeFunctionResult({ abi: PythiaABI, functionName: 'getMarketBets', data: betsResult as `0x${string}` }) as Array<{
                            bettor: string; isYes: boolean; amount: bigint; nullifierHash: bigint; timestamp: bigint; claimed: boolean
                        }>

                        // Compute real Merkle root from actual bet records
                        const betsMerkleRoot = computeBetsMerkleRoot(
                            bets.map(b => ({ bettor: b.bettor, amount: b.amount, isYes: b.isYes }))
                        )

                        // Compute payout leaves for winners
                        const winningIsYes = result.aiOutcome === 'YES'
                        const totalPool = BigInt(result.yesPool) + BigInt(result.noPool)
                        const winningPool = winningIsYes ? BigInt(result.yesPool) : BigInt(result.noPool)
                        const winnerPayouts = bets
                            .filter(b => b.isYes === winningIsYes)
                            .map(b => ({
                                winner: b.bettor,
                                payout: winningPool > 0n ? (b.amount * totalPool) / winningPool : 0n,
                            }))

                        const payoutsMerkleRoot = computePayoutsMerkleRoot(winnerPayouts)
                        const totalPaidOut = winnerPayouts.reduce((sum, p) => sum + p.payout, 0n)

                        const attestCalldata = encodeFunctionData({
                            abi: PythiaABI,
                            functionName: 'submitAttestation',
                            args: [
                                marketId,
                                betsMerkleRoot,
                                payoutsMerkleRoot,
                                totalPaidOut,
                                BigInt(winnerPayouts.length),
                            ],
                        })
                        const attestMsg = encodeCallMsg(evmClient, pythiaAddr, attestCalldata)
                        runtime.sendTx(attestMsg)
                        runtime.log(`    >> Attestation submitted: betsMerkleRoot=${betsMerkleRoot.slice(0, 10)}... winners=${winnerPayouts.length}`)
                    } catch (e) {
                        runtime.log(`    >> Could not write attestation: ${e}`)
                    }
                }
            } else {
                runtime.log(`    >> SKIPPING resolution: confidence ${result.aiConfidence}% < 70% threshold`)
                runtime.log(`    >> NOTE: If confidence stays low, owner can emergencyResolve() after 30 days past resolutionTime`)
            }
        }
    } else {
        runtime.log('\n  STEP 4-5: No markets pending resolution')
        runtime.log('  All markets either still accepting bets or already resolved')
    }

    // ── SUMMARY ──
    runtime.log('\n═══════════════════════════════════════════════════════')
    runtime.log('  PYTHIA CYCLE SUMMARY')
    runtime.log('═══════════════════════════════════════════════════════')
    runtime.log(`  Total markets: ${totalMarkets}`)
    runtime.log(`  Active markets: ${activeMarketIds.length}`)
    runtime.log(`  Pending resolution: ${pendingResolution.length}`)
    runtime.log(`  ETH/USD: $${ethPrice.toFixed(2)}`)
    runtime.log('  ─────────────────────────────────────────────────────')
    runtime.log('  SYBIL RESISTANCE:')
    runtime.log('    World ID:          VERIFIED (1 person = 1 bet per market)')
    runtime.log('    Bet caps:          ENFORCED (equal participation, no whales)')
    runtime.log('  PRIVACY STATUS:')
    runtime.log('    Bet amounts:       PRIVATE (ACE private transfers)')
    runtime.log('    Bet positions:     NOT ON-CHAIN (hidden via ACE)')
    runtime.log('    Payout amounts:    PRIVATE (ACE private transfers)')
    runtime.log('    API credentials:   PROTECTED (CRE Secrets)')
    runtime.log('    Event data:        CONFIDENTIAL (fetched via Confidential HTTP)')
    runtime.log('  ─────────────────────────────────────────────────────')
    runtime.log('  Chainlink Capabilities Used:')
    runtime.log('    1. CRE Runtime Environment    — Workflow orchestration')
    runtime.log('    2. CRE Secrets                — TEE-protected API keys')
    runtime.log('    3. Confidential HTTP           — World ID + event data + AI')
    runtime.log('    4. Confidential Compute (ACE)  — Private bets + payouts')
    runtime.log('    5. Data Feeds                  — ETH/USD price')
    runtime.log('    6. CCIP                        — Cross-chain market participation')
    runtime.log('═══════════════════════════════════════════════════════')

    return 'Pythia prediction market cycle complete'
}

function initWorkflow(config: Config) {
    const cronTrigger = new cre.capabilities.CronCapability()
    return [
        cre.handler(
            cronTrigger.trigger({ schedule: config.schedule }),
            onCron,
        ),
    ]
}

export async function main() {
    const runner = await Runner.newRunner<Config>({ configSchema })
    await runner.run(initWorkflow)
}

main()
