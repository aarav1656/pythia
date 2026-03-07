# Pythia - Sybil-Resistant Prediction Markets

> **"The prediction market where every person matters equally."**

Pythia is a prediction market platform where **World ID ZK proofs** enforce 1-person-1-bet on-chain, and **AI resolves markets** using verified real-world data via **Chainlink CRE**.

## Problem

Existing prediction markets (Polymarket) suffer from:
- **Whale manipulation**: Single wallets move odds 10%+ with millions in capital
- **Complex UX**: Desktop-heavy DeFi interfaces exclude mobile users
- **No sybil resistance**: Anyone can create 1,000 wallets to dominate markets

## Solution

| Feature | How It Works | Status |
|---------|-------------|--------|
| **Fair Odds** | World ID ZK proof verified on-chain: 1 human = 1 capped bet | Implemented |
| **AI Resolution** | CRE workflow + OpenRouter AI analyzes real-world data | Implemented |
| **Platform Fee** | 2.5% fee on all bets — sustainable protocol economics | Implemented |
| **Emergency Fallback** | Owner can resolve stuck markets 30 days after resolutionTime | Implemented |
| **Mobile-First** | Tinder-style swipe: right = YES, left = NO | Implemented |
| **Private Bets** | Chainlink ACE integration — planned for mainnet | Roadmap |
| **Cross-Chain** | CCIP for cross-chain market participation | Roadmap |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PYTHIA PLATFORM                      │
├──────────────┬──────────────────┬───────────────────────┤
│  Smart       │  CRE Workflow    │  Frontend             │
│  Contract    │  (5 Steps)       │  (Swipe UI)           │
│              │                  │                       │
│  Pythia.sol  │  1. Read Markets │  trade/page.tsx       │
│  - Markets   │  2. Data Feeds   │  useMarkets hook      │
│  - Bets      │  3. World ID     │  Jupiter price AI     │
│  - WorldID   │  4. Event Data   │  On-chain stats       │
│  - Resolution│  5. AI Analysis  │                       │
│  - EmergencyResolve             │                       │
├──────────────┴──────────────────┴───────────────────────┤
│            Chainlink Capabilities Used                  │
│    CRE · Secrets · Confidential HTTP · Data Feeds       │
└─────────────────────────────────────────────────────────┘
```

## 🔗 Chainlink Capabilities Used

| # | Capability | Usage in Pythia | Status |
|---|-----------|-----------------|--------|
| 1 | **CRE Runtime** | Workflow orchestration — reads markets, triggers resolution | Active |
| 2 | **CRE Secrets** | TEE-protected API keys (OpenRouter, event APIs) | Active |
| 3 | **Confidential HTTP** | Event data APIs + OpenRouter AI analysis | Active |
| 4 | **Data Feeds** | ETH/USD price for context in AI prompts | Active |
| 5 | **ACE (Confidential Compute)** | Private bet + payout transfers | Planned |
| 6 | **CCIP** | Cross-chain market participation | Planned |

## 🔐 World ID ZK Verification

The contract enforces true sybil resistance via on-chain ZK proof verification:

```solidity
// IWorldID.verifyProof() called on every bet — reverts if ZK proof invalid
worldId.verifyProof(root, WORLD_ID_GROUP_ID, signalHash, nullifierHash, externalNullifier, proof);

// Nullifier stored — can never be reused (1 human = 1 bet per market)
require(!hasUsedNullifier[marketId][nullifierHash], "Pythia: already bet");
hasUsedNullifier[marketId][nullifierHash] = true;
```

Signal is `keccak256(msg.sender) >> 8` — ties the ZK proof to the specific transaction sender, preventing front-running attacks.

## 🛡️ Emergency Resolution

If CRE workflow fails or AI confidence never reaches 70%, funds are not locked forever:

```solidity
// Owner can resolve ONLY after 30 days past resolutionTime
// This prevents the owner from gaming markets early
function emergencyResolve(uint256 marketId, Outcome outcome, string calldata reason)
    external onlyOwner
{
    require(block.timestamp >= market.resolutionTime + EMERGENCY_LOCK, "30 days required");
    ...
}
```

## 📊 Real Merkle Attestation

The CRE workflow reads actual bet data from chain and computes a real keccak256 Merkle tree:

```typescript
// Reads getMarketBets() from chain — real bet records
const bets = decodeFunctionResult(...)

// Computes leaf = keccak256(abi.encodePacked(bettor, amount, isYes))
const betsMerkleRoot = computeBetsMerkleRoot(bets)

// Sends attestation ONLY after resolveMarket tx is confirmed (no race condition)
if (txResult.status === TxStatus.Confirmed) {
    runtime.sendTx(attestMsg)
}
```

## 📁 Project Structure

```
pythia/
├── contracts/
│   ├── src/Pythia.sol          # Core contract with World ID + emergency resolve
│   ├── test/Pythia.t.sol       # Test suite
│   └── foundry.toml
├── my-workflow/
│   ├── main.ts                 # CRE workflow (real Merkle roots, location-aware weather)
│   ├── config.staging.json     # Contract + API config
│   └── workflow.yaml
├── frontend/
│   └── src/
│       ├── app/trade/page.tsx  # Swipe UI — reads live on-chain markets
│       ├── hooks/useMarkets.ts # wagmi hook — fetches markets from contract
│       └── lib/markets.ts      # Market types + utils
└── README.md
```

## 🚀 Quick Start

### Smart Contract

```bash
cd contracts
forge install
forge test -vv
# Deploy with World ID router address for your chain
forge script script/Deploy.s.sol \
  --sig "run(address,uint256)" \
  <WORLD_ID_ROUTER> <EXTERNAL_NULLIFIER> \
  --rpc-url world_chain_sepolia --broadcast
```

World ID router addresses:
- World Chain Sepolia: `0x469449f251692E0779667583026b5A1E99512157`
- World Chain Mainnet: `0x17B354dE2Bf56b3bf29B4f12aDF25ac47b73c79c`

### CRE Workflow

```bash
cd my-workflow
bun install
cre workflow simulate my-workflow -T staging-settings
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Markets load from on-chain contract automatically
# Falls back to seed markets if contract returns empty
```

## 📜 License

MIT
