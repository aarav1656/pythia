# Pythia — Sybil-Resistant Private Prediction Markets

> **"The prediction market where every person matters equally, and your bets stay private."**

Pythia is a prediction market platform where **World ID ensures 1-person-1-bet** (no whale manipulation), **ACE private transfers** keep bets and payouts confidential, and **AI resolves markets** using verified real-world data — all powered by **Chainlink CRE**.

## 🎯 Problem

Existing prediction markets (Polymarket) suffer from:
- **Whale manipulation**: Single wallets move odds 10%+ with millions in capital
- **Public bets**: Your position is visible on Etherscan — dangerous for political, corporate, or sensitive markets
- **Complex UX**: Desktop-heavy DeFi interfaces exclude mobile users

## 💡 Solution

| Feature | How It Works |
|---------|-------------|
| **Fair Odds** | World ID nullifier: 1 verified human = 1 capped bet per market |
| **Private Bets** | Chainlink ACE: bets + payouts invisible on-chain |
| **AI Resolution** | CRE workflow + OpenRouter AI analyzes multiple data sources |
| **Mobile-First** | Tinder-style swipe: right = YES, left = NO |
| **World Mini App** | Gas-free betting inside World App (10M+ users) |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PYTHIA PLATFORM                       │
├──────────────┬──────────────────┬───────────────────────┤
│  Smart       │  CRE Workflow    │  Frontend             │
│  Contract    │  (6 Steps)       │  (Tinder UI)          │
│              │                  │                       │
│  Pythia.sol  │  1. Read Markets │  SwipeCard.tsx        │
│  - Markets   │  2. Data Feeds   │  CardStack.tsx        │
│  - Bets      │  3. World ID     │  BetModal             │
│  - Resolution│  4. Event Data   │  OddsBar              │
│  - Attestation  5. AI Analysis  │  Stats                │
│              │  6. ACE Payouts  │                       │
├──────────────┴──────────────────┴───────────────────────┤
│           Chainlink Capabilities (6 Used)               │
│  CRE · Secrets · Confidential HTTP · ACE · Feeds · CCIP│
└─────────────────────────────────────────────────────────┘
```

## 🔗 Chainlink Capabilities Used (6)

| # | Capability | Usage in Pythia |
|---|-----------|-----------------|
| 1 | **CRE Runtime** | Workflow orchestration — reads markets, triggers resolution |
| 2 | **CRE Secrets** | TEE-protected API keys (OpenRouter, World ID app secret) |
| 3 | **Confidential HTTP** | World ID verification, event data APIs, AI analysis |
| 4 | **ACE (Confidential Compute)** | Private bet placement + private winner payouts |
| 5 | **Data Feeds** | ETH/USD price for bet denomination |
| 6 | **CCIP** | Cross-chain market participation |

## 📁 Project Structure

```
pythia/
├── contracts/
│   ├── src/Pythia.sol          # Core prediction market contract
│   ├── test/Pythia.t.sol       # 39 comprehensive tests
│   ├── script/Deploy.s.sol     # Deployment with 5 seed markets
│   └── foundry.toml
├── my-workflow/
│   ├── main.ts                 # 6-step CRE workflow
│   ├── config.staging.json     # Contract + API config
│   ├── workflow.yaml           # CRE settings
│   └── package.json
├── frontend/
│   └── src/
│       ├── app/page.tsx        # Main swipe interface
│       ├── components/
│       │   ├── SwipeCard.tsx   # Tinder-style drag card
│       │   └── CardStack.tsx   # Card stack + bet modal
│       └── lib/markets.ts      # Market types + utils
├── project.yaml                # CRE project config
├── secrets.yaml                # CRE secrets (3 keys)
└── README.md
```

## 🚀 Quick Start

### Smart Contract
```bash
cd contracts
forge install
forge test -vv              # 39 tests, all passing
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

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
npm run dev                   # http://localhost:3000
```

## 🧪 Testing

### Smart Contract Tests (39/39 Passing)

| Category | Tests | Description |
|----------|-------|-------------|
| Market Creation | 5 | Create, validate, edge cases |
| Betting | 7 | YES/NO, sybil resistance, caps |
| Resolution | 6 | CRE-only, outcomes, access control |
| Payouts | 5 | Winners, losers, INVALID refunds, proportional |
| Attestation | 3 | Privacy proofs, duplicates |
| Views | 3 | Active markets, pending resolution, stats |
| Admin | 2 | CRE workflow, access |
| Edge Cases | 8 | Nullifier across markets, double claims |

### World ID Sybil Resistance

```solidity
// Each World ID nullifier can only bet ONCE per market
require(!hasUsedNullifier[marketId][worldIdNullifier], "Pythia: already bet");
hasUsedNullifier[marketId][worldIdNullifier] = true;

// PLUS address-level check (belt + suspenders)
require(!userHasBet[marketId][msg.sender], "Pythia: already placed bet");
```

## 🏆 Hackathon Tracks Covered

| Track | Prize | How Pythia Qualifies |
|-------|-------|---------------------|
| **Prediction Markets** | $16,000 | Core product — sybil-resistant prediction market |
| **World ID + CRE** | $10,000 | World ID nullifier for 1-person-1-bet enforcement |
| **World Mini App** | $10,000 | Tinder-style mobile UI, World App compatible |
| **Privacy** | $8,000 | ACE private bets + payouts, Confidential HTTP |
| **CRE & AI** | $16,000 | AI-powered market resolution via OpenRouter |
| **Top 10** | $20,000 | Eligible as one of top projects |

**Total potential prize pool coverage: $80,000+**

## 📜 License

MIT
