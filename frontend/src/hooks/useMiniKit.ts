'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex, keccak256, encodePacked } from 'viem'
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

// Deterministic nullifier: keccak256(address, marketId) — unique per (user, market).
// Used as fallback when World ID verify isn't configured or fails.
// The deployed contract stores this bytes32 but does NOT verify the ZK proof on-chain,
// so this still enforces 1-bet-per-market via userHasBet[marketId][msg.sender].
function deterministicNullifier(address: string, marketId: number): `0x${string}` {
  return keccak256(encodePacked(['address', 'uint256'], [address as `0x${string}`, BigInt(marketId)]))
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

  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    betAmountEth: number,
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('Open in World App to place bets')
    }

    // Read address fresh at call time
    const currentAddress = getMiniKitAddress() ?? user.address ?? ''

    // ── Step 1: Try World ID verification (optional — contract doesn't verify ZK on-chain) ──
    let nullifierBytes32: `0x${string}`

    try {
      const verifyResult = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
        signal: currentAddress,
        verification_level: VerificationLevel.Device,
      })

      if (verifyResult.finalPayload.status === 'error') {
        const code = (verifyResult.finalPayload as any).error_code ?? 'unknown'
        if (code === 'user_rejected') throw new Error('rejected')
        // Verify failed for non-user reason (action not registered, etc.) — use fallback nullifier
        nullifierBytes32 = deterministicNullifier(currentAddress, marketId)
      } else {
        // Verify succeeded — use the real nullifier_hash from World ID
        const { nullifier_hash } = verifyResult.finalPayload as { nullifier_hash: string; status: 'success' }
        const nullifierBigInt = BigInt(nullifier_hash)
        nullifierBytes32 = `0x${nullifierBigInt.toString(16).padStart(64, '0')}`
      }
    } catch (e: unknown) {
      // If user explicitly rejected, propagate
      if (e instanceof Error && e.message === 'rejected') throw e
      // Any other error (network, World App crash, unregistered action) — use fallback nullifier
      nullifierBytes32 = deterministicNullifier(currentAddress, marketId)
    }

    // ── Step 2: Send transaction via World App ──
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
        throw new Error('Need testnet ETH — get from World Chain Sepolia faucet')
      }
      if (code === 'simulation_failed' || code === 'simulation_reverted') {
        const debugUrl = payload.debug_url ?? ''
        throw new Error(`simulation_failed${debugUrl ? `\n${debugUrl}` : ''} — already bet on this market or market closed`)
      }
      throw new Error(code)
    }

    return (txResult.finalPayload as any).transaction_id as string
  }, [user.address])

  // Expose fresh wallet address for display
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
