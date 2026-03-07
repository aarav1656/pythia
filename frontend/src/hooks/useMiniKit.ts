'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex } from 'viem'
import { CONTRACTS } from '@/lib/contracts'

// Minimal ABI for MiniKit — only the function being called
const PLACE_BET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'isYes', type: 'bool' },
      { name: 'worldIdNullifier', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

interface User {
  address: string | null
  isVerified: boolean
  isInWorldApp: boolean
}

// Read wallet address from MiniKit at call time (more reliable than cached state)
function getMiniKitAddress(): string | null {
  const u = MiniKit.user as any
  return u?.walletAddress ?? u?.address ?? null
}

export function useMiniKit() {
  const [user, setUser] = useState<User>({
    address: null,
    isVerified: false,
    isInWorldApp: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  const { address: walletAddress, isConnected } = useAccount()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    const inWorldApp = MiniKit.isInstalled()

    if (inWorldApp) {
      const addr = getMiniKitAddress()
      setUser({ address: addr, isVerified: false, isInWorldApp: true })
      setIsLoading(false)

      // MiniKit may populate user asynchronously — re-read after a short tick
      const t = setTimeout(() => {
        const addrRetry = getMiniKitAddress()
        if (addrRetry) setUser(prev => ({ ...prev, address: addrRetry }))
      }, 500)
      return () => clearTimeout(t)
    } else if (isConnected && walletAddress) {
      setUser({ address: walletAddress, isVerified: false, isInWorldApp: false })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [isConnected, walletAddress])

  /**
   * Bet flow in World App:
   * 1. MiniKit.commandsAsync.verify() → World ID biometric drawer
   * 2. Convert nullifier_hash → bytes32 for the deployed contract
   * 3. MiniKit.commandsAsync.sendTransaction() → signing sheet
   *
   * NOTE: The deployed contract (0x6158fa6b...) uses the original
   * placeBet(marketId, isYes, bytes32 worldIdNullifier) signature.
   * The nullifier_hash from World ID verify is unique per (human × action),
   * providing sybil resistance. On-chain ZK proof verification is in the
   * updated Pythia.sol source — redeploy to activate it.
   */
  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    betAmountEth: number,
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('Open in World App to place bets')
    }

    // Read address fresh at call time — MiniKit may have populated it since mount
    const currentAddress = getMiniKitAddress() ?? user.address ?? ''

    // ── Step 1: World ID biometric verification ──
    const verifyResult = await MiniKit.commandsAsync.verify({
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
      signal: currentAddress,
      verification_level: VerificationLevel.Orb,
    })

    if (verifyResult.finalPayload.status === 'error') {
      const code = (verifyResult.finalPayload as any).error_code ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      throw new Error(`World ID failed: ${code}`)
    }

    const { nullifier_hash } = verifyResult.finalPayload as {
      nullifier_hash: string
      merkle_root: string
      proof: string
      status: 'success'
    }

    // ── Step 2: Convert nullifier_hash to bytes32 ──
    // World ID returns nullifier_hash as a decimal string (e.g. "12345678901234...")
    // BigInt() handles both decimal and 0x-prefixed hex safely
    const nullifierBigInt = BigInt(nullifier_hash)
    const nullifierBytes32 = `0x${nullifierBigInt.toString(16).padStart(64, '0')}` as `0x${string}`

    // ── Step 3: Send transaction via World App ──
    const txResult = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: CONTRACTS.pythia,
        abi: PLACE_BET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, nullifierBytes32],
        value: toHex(parseEther(String(betAmountEth))),
      }],
    })

    if (txResult.finalPayload.status === 'error') {
      const payload = txResult.finalPayload as any
      const code = payload.error_code ?? payload.description ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      if (code === 'insufficient_funds' || code === 'insufficient_balance') {
        throw new Error('insufficient ETH — get testnet ETH from World Chain Sepolia faucet')
      }
      if (code === 'simulation_failed' || code === 'simulation_reverted') {
        const debugUrl = payload.debug_url ?? ''
        throw new Error(`simulation_failed${debugUrl ? `\n${debugUrl}` : ''} — check contract: already bet, market closed, or wrong args`)
      }
      throw new Error(`${code}`)
    }

    return (txResult.finalPayload as any).transaction_id as string
  }, [user.address])

  // Expose fresh wallet address for display (reads from MiniKit live)
  const walletAddressDisplay = MiniKit.isInstalled()
    ? getMiniKitAddress() ?? user.address
    : isConnected ? walletAddress ?? null : null

  return {
    user,
    isLoading,
    placeBet,
    walletAddress: walletAddressDisplay,
    isInWorldApp: MiniKit.isInstalled(),
    isWalletConnected: isConnected,
    isTransactionPending: isPending,
    isTransactionConfirmed: isConfirming,
  }
}

export function formatAddress(address: string | null | undefined): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
