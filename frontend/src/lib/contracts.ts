import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

// ────────────────────────────────────────────────────────────────
// WORLD CHAIN SEPOLIA (required for World Mini Apps)
// ────────────────────────────────────────────────────────────────

export const worldChainSepolia = defineChain({
    id: 4801,
    name: 'World Chain Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://worldchain-sepolia.gateway.tenderly.co'] },
    },
    blockExplorers: {
        default: { name: 'Worldscan', url: 'https://sepolia.worldscan.org' },
    },
    testnet: true,
})

// ────────────────────────────────────────────────────────────────
// WAGMI CONFIG
// ────────────────────────────────────────────────────────────────

export const config = createConfig({
    chains: [worldChainSepolia],
    connectors: [injected()],
    transports: {
        [worldChainSepolia.id]: http('https://worldchain-sepolia.gateway.tenderly.co'),
    },
})

// ────────────────────────────────────────────────────────────────
// CONTRACT ADDRESSES (World Chain Sepolia)
// ────────────────────────────────────────────────────────────────
// Update after deploying with: forge script script/Deploy.s.sol

export const CONTRACTS = {
    pythia: '0x6158fa6bA28a664660B3beb4F8992694dbAD4fAC' as `0x${string}`,
} as const

// ────────────────────────────────────────────────────────────────
// PYTHIA ABI (subset used by frontend)
// ────────────────────────────────────────────────────────────────

export const PYTHIA_ABI = [
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
        name: 'getActiveMarketIds',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256[]' }],
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
        name: 'getUserBet',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'user', type: 'address' },
        ],
        outputs: [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'bettor', type: 'address' },
                { name: 'isYes', type: 'bool' },
                { name: 'amount', type: 'uint256' },
                { name: 'worldIdNullifier', type: 'bytes32' },
                { name: 'timestamp', type: 'uint256' },
                { name: 'claimed', type: 'bool' },
            ],
        }],
    },
    {
        name: 'placeBet',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'marketId',         type: 'uint256' },
            { name: 'isYes',            type: 'bool' },
            { name: 'worldIdNullifier', type: 'bytes32' },
        ],
        outputs: [],
    },
    {
        name: 'claimWinnings',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'marketId', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'marketCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'userHasBet',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'marketId', type: 'uint256' },
            { name: 'user', type: 'address' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const
