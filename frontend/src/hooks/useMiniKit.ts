'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex, keccak256, encodePacked } from 'viem'
import { CONTRACTS } from '@/lib/contracts'

// Minimal ABI matching the deployed contract: 0x6158fa6bA28a664660B3beb4F8992694dbAD4fAC
// placeBet(uint256 marketId, bool isYes, bytes32 worldIdNullifier)
const PLACE_BET_ABI = [
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
] as const

interface User {
  address: string | null
  isVerified: boolean
  isInWorldApp: boolean
}

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
    const inWorldApp = MiniKit.isInstalled()

    if (inWorldApp) {
      // ── World App flow: MiniKit verify + sendTransaction ──
      const currentAddress = getMiniKitAddress() ?? user.address ?? ''

      const verifyResult = await MiniKit.commandsAsync.verify({
        action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
        signal: currentAddress,
        verification_level: VerificationLevel.Device,
      })

      if (verifyResult.finalPayload.status === 'error') {
        const code = (verifyResult.finalPayload as any).error_code ?? 'unknown'
        if (code === 'user_rejected') throw new Error('rejected')
        if (code === 'action_not_found' || code === 'invalid_action') {
          throw new Error('Action not registered — add "place-bet" action in developer.worldcoin.org → your app → Actions')
        }
        throw new Error(`Verification failed: ${code}`)
      }

      const { nullifier_hash } = verifyResult.finalPayload as {
        nullifier_hash: string
        merkle_root: string
        proof: string
        status: 'success'
      }

      const nullifierBigInt = BigInt(nullifier_hash)
      const nullifierBytes32 = `0x${nullifierBigInt.toString(16).padStart(64, '0')}` as `0x${string}`

      console.log('[Pythia] MiniKit sendTransaction:', { marketId, isYes, nullifierBytes32 })
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
        console.error('[Pythia] sendTransaction error:', JSON.stringify(payload, null, 2))
        const code = payload.error_code ?? payload.description ?? 'unknown'
        const desc = payload.description ?? payload.mini_app_error_detail ?? ''
        const debugUrl = payload.details?.debugUrl ?? ''
        if (code === 'user_rejected') throw new Error('rejected')
        const detail = [code, desc, debugUrl].filter(Boolean).join(' | ')
        throw new Error(detail || JSON.stringify(payload).slice(0, 300))
      }

      return (txResult.finalPayload as any).transaction_id as string
    } else {
      // ── Browser flow: wagmi writeContract (for simulator / MetaMask testing) ──
      if (!isConnected || !walletAddress) {
        throw new Error('Connect your wallet first (MetaMask → World Chain Sepolia)')
      }

      // Derive a deterministic nullifier from the wallet address
      // In production this would come from World ID verification
      const nullifierBytes32 = keccak256(
        encodePacked(['address', 'uint256'], [walletAddress, BigInt(marketId)])
      ) as `0x${string}`

      console.log('[Pythia] wagmi writeContract:', {
        marketId, isYes, nullifierBytes32,
        value: parseEther(String(betAmountEth)).toString(),
        from: walletAddress,
      })

      const txHash = await writeContractAsync({
        address: CONTRACTS.pythia,
        abi: PLACE_BET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, nullifierBytes32],
        value: parseEther(String(betAmountEth)),
      })

      return txHash
    }
  }, [user.address, isConnected, walletAddress, writeContractAsync])

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
