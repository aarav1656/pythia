// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ──────────────────────────────────────────────────────────────
// WORLD ID — On-chain ZK proof verification interface
// Deployed on World Chain at: https://docs.world.org/world-chain/addresses
// ──────────────────────────────────────────────────────────────
interface IWorldID {
    /// @notice Verifies a WorldID zero-knowledge proof on-chain
    /// @param root       The latest Semaphore root (from World ID state)
    /// @param groupId    Always 1 for World ID Orb verification
    /// @param signalHash keccak256(signal) >> 8 — hash of bettor address
    /// @param nullifierHash Unique per user per action — stored to prevent reuse
    /// @param externalNullifier keccak256(appId, actionId) >> 8
    /// @param proof      8 field elements from Groth16 ZK proof
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata proof
    ) external view;
}

/// @title Pythia — Sybil-Resistant Prediction Markets
/// @notice Prediction market where on-chain World ID ZK proofs ensure 1-person-1-bet
/// @dev Integrates with Chainlink CRE for AI-powered market resolution
contract Pythia {
    // ──────────────────────────────────────────────────────────────
    //  TYPES
    // ──────────────────────────────────────────────────────────────

    enum Outcome { UNRESOLVED, YES, NO, INVALID }
    enum Category { CRYPTO, SPORTS, POLITICS, WEATHER, ENTERTAINMENT, OTHER }

    struct Market {
        uint256 id;
        string question;
        Category category;
        uint256 endTime;
        uint256 resolutionTime;
        uint256 yesPool;
        uint256 noPool;
        uint256 betCount;
        uint256 maxBetPerPerson;
        Outcome outcome;
        bool resolved;
        uint8 aiConfidence;
        string resolutionSource;
        address creator;
        uint256 createdAt;
    }

    struct Bet {
        address bettor;
        bool isYes;
        uint256 amount;          // net of fee — used for payout math
        uint256 originalAmount;  // msg.value — refunded in full on INVALID
        uint256 nullifierHash;   // World ID nullifier (uint256 from ZK proof)
        uint256 timestamp;
        bool claimed;
    }

    struct ResolutionAttestation {
        bytes32 betsMerkleRoot;
        bytes32 payoutsMerkleRoot;
        uint256 totalPaidOut;
        uint256 winnerCount;
        uint256 attestedAt;
    }

    // ──────────────────────────────────────────────────────────────
    //  CONSTANTS
    // ──────────────────────────────────────────────────────────────

    uint256 public constant WORLD_ID_GROUP_ID = 1;        // Orb-verified humans
    uint256 public constant PLATFORM_FEE_BPS = 250;       // 2.5% platform fee
    uint256 public constant EMERGENCY_LOCK = 30 days;     // Admin override delay after resolutionTime

    // ──────────────────────────────────────────────────────────────
    //  STATE
    // ──────────────────────────────────────────────────────────────

    address public owner;
    address public creWorkflow;
    IWorldID public worldId;           // World ID router contract
    uint256 public externalNullifier;  // keccak256(appId, actionId) >> 8 — set once at deploy

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;

    mapping(uint256 => Bet[]) public marketBets;
    mapping(uint256 => uint256) public marketBetCount;

    // Sybil resistance: marketId => nullifierHash => hasBet
    // World ID nullifier is unique per (human, action) — verified on-chain via ZK proof
    mapping(uint256 => mapping(uint256 => bool)) public hasUsedNullifier;

    mapping(uint256 => mapping(address => uint256)) public userBetIndex;
    mapping(uint256 => mapping(address => bool)) public userHasBet;

    mapping(uint256 => ResolutionAttestation) public attestations;

    uint256 public totalVolume;
    uint256 public totalBets;
    uint256 public resolvedMarkets;
    uint256 public collectedFees;

    // Reentrancy guard
    bool private _locked;

    // ──────────────────────────────────────────────────────────────
    //  EVENTS
    // ──────────────────────────────────────────────────────────────

    event MarketCreated(uint256 indexed marketId, string question, Category category, uint256 endTime, uint256 maxBetPerPerson, address creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool isYes, uint256 amount, uint256 newYesPool, uint256 newNoPool);
    event MarketResolved(uint256 indexed marketId, Outcome outcome, uint8 aiConfidence, string resolutionSource, uint256 yesPool, uint256 noPool);
    event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 payout);
    event AttestationRecorded(uint256 indexed marketId, bytes32 betsMerkleRoot, bytes32 payoutsMerkleRoot, uint256 totalPaidOut);
    event CREWorkflowUpdated(address indexed workflow);
    event WorldIdUpdated(address indexed worldId, uint256 externalNullifier);
    event EmergencyResolved(uint256 indexed marketId, Outcome outcome, string reason);
    event FeeWithdrawn(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────────────────────
    //  MODIFIERS
    // ──────────────────────────────────────────────────────────────

    modifier onlyOwner() { require(msg.sender == owner, "Pythia: not owner"); _; }
    modifier onlyCRE() { require(msg.sender == creWorkflow, "Pythia: not CRE workflow"); _; }
    modifier marketExists(uint256 marketId) { require(marketId < marketCount, "Pythia: market does not exist"); _; }
    modifier nonReentrant() { require(!_locked, "Pythia: reentrant call"); _locked = true; _; _locked = false; }

    // ──────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────────────────────

    /// @param _creWorkflow   Address of the Chainlink CRE workflow
    /// @param _worldId       World ID router address on this chain
    /// @param _externalNullifier keccak256(abi.encodePacked(appId, actionId)) >> 8
    constructor(address _creWorkflow, address _worldId, uint256 _externalNullifier) {
        owner = msg.sender;
        creWorkflow = _creWorkflow;
        worldId = IWorldID(_worldId);
        externalNullifier = _externalNullifier;
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET CREATION
    // ──────────────────────────────────────────────────────────────

    function createMarket(
        string calldata question,
        Category category,
        uint256 endTime,
        uint256 resolutionTime,
        uint256 maxBetPerPerson
    ) external returns (uint256) {
        require(endTime > block.timestamp, "Pythia: end time must be in future");
        require(resolutionTime >= endTime, "Pythia: resolution must be after end");
        require(maxBetPerPerson > 0, "Pythia: max bet must be positive");
        require(bytes(question).length > 0, "Pythia: question cannot be empty");

        uint256 marketId = marketCount++;
        markets[marketId] = Market({
            id: marketId,
            question: question,
            category: category,
            endTime: endTime,
            resolutionTime: resolutionTime,
            yesPool: 0,
            noPool: 0,
            betCount: 0,
            maxBetPerPerson: maxBetPerPerson,
            outcome: Outcome.UNRESOLVED,
            resolved: false,
            aiConfidence: 0,
            resolutionSource: "",
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit MarketCreated(marketId, question, category, endTime, maxBetPerPerson, msg.sender);
        return marketId;
    }

    // ──────────────────────────────────────────────────────────────
    //  BETTING — World ID ZK Proof Verified
    // ──────────────────────────────────────────────────────────────

    /// @notice Place a verified bet via World ID ZK proof
    /// @dev Calls IWorldID.verifyProof() — rejects any non-human or reused nullifier
    /// @param marketId The market to bet on
    /// @param isYes    true = YES (swipe right), false = NO (swipe left)
    /// @param root           Semaphore root from World ID state
    /// @param nullifierHash  Unique per (human, action) — derived from biometric + appId + actionId
    /// @param proof          Groth16 ZK proof (8 field elements)
    function placeBet(
        uint256 marketId,
        bool isYes,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external payable nonReentrant marketExists(marketId) {
        Market storage market = markets[marketId];

        require(block.timestamp < market.endTime, "Pythia: betting closed");
        require(!market.resolved, "Pythia: market already resolved");
        require(msg.value >= 0.001 ether, "Pythia: minimum bet 0.001 ETH");
        require(msg.value <= market.maxBetPerPerson, "Pythia: exceeds max bet per person");

        // ── WORLD ID ZK PROOF VERIFICATION (on-chain) ──
        // Signal = bettor address (ties proof to this specific transaction sender)
        uint256 signalHash = uint256(keccak256(abi.encodePacked(msg.sender))) >> 8;

        // Verify ZK proof against the World ID router — reverts if invalid
        worldId.verifyProof(root, WORLD_ID_GROUP_ID, signalHash, nullifierHash, externalNullifier, proof);

        // Nullifier is now verified as a real human action — prevent reuse
        require(!hasUsedNullifier[marketId][nullifierHash], "Pythia: already bet on this market");
        hasUsedNullifier[marketId][nullifierHash] = true;

        // Belt + suspenders: also prevent same address from double-betting
        require(!userHasBet[marketId][msg.sender], "Pythia: already placed bet");
        userHasBet[marketId][msg.sender] = true;

        // Deduct platform fee (2.5%) — remainder goes to pool
        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 betAmount = msg.value - fee;
        collectedFees += fee;

        uint256 betIndex = marketBets[marketId].length;
        marketBets[marketId].push(Bet({
            bettor: msg.sender,
            isYes: isYes,
            amount: betAmount,
            originalAmount: msg.value,
            nullifierHash: nullifierHash,
            timestamp: block.timestamp,
            claimed: false
        }));

        userBetIndex[marketId][msg.sender] = betIndex;
        marketBetCount[marketId]++;

        if (isYes) {
            market.yesPool += betAmount;
        } else {
            market.noPool += betAmount;
        }
        market.betCount++;
        totalVolume += betAmount;
        totalBets++;

        emit BetPlaced(marketId, msg.sender, isYes, betAmount, market.yesPool, market.noPool);
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET RESOLUTION (CRE Workflow Only)
    // ──────────────────────────────────────────────────────────────

    function resolveMarket(
        uint256 marketId,
        Outcome outcome,
        uint8 aiConfidence,
        string calldata resolutionSource
    ) external onlyCRE marketExists(marketId) {
        Market storage market = markets[marketId];
        require(!market.resolved, "Pythia: already resolved");
        require(outcome != Outcome.UNRESOLVED, "Pythia: cannot resolve as unresolved");
        // H1: Prevent CRE from resolving while betting is still open
        require(block.timestamp >= market.resolutionTime, "Pythia: resolution time not reached");

        market.outcome = outcome;
        market.resolved = true;
        market.aiConfidence = aiConfidence;
        market.resolutionSource = resolutionSource;
        resolvedMarkets++;

        emit MarketResolved(marketId, outcome, aiConfidence, resolutionSource, market.yesPool, market.noPool);
    }

    /// @notice Emergency resolution — owner can resolve stuck markets after 30 days post-resolutionTime
    /// @dev This fallback exists for markets where CRE fails or AI confidence never reaches 70%.
    ///      The 30-day lock prevents the owner from gaming markets early.
    function emergencyResolve(
        uint256 marketId,
        Outcome outcome,
        string calldata reason
    ) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(!market.resolved, "Pythia: already resolved");
        require(outcome != Outcome.UNRESOLVED, "Pythia: cannot resolve as unresolved");
        require(
            block.timestamp >= market.resolutionTime + EMERGENCY_LOCK,
            "Pythia: emergency lock period not elapsed (30 days required)"
        );

        market.outcome = outcome;
        market.resolved = true;
        market.aiConfidence = 0;
        market.resolutionSource = string(abi.encodePacked("EMERGENCY: ", reason));
        resolvedMarkets++;

        emit EmergencyResolved(marketId, outcome, reason);
    }

    // ──────────────────────────────────────────────────────────────
    //  CLAIM WINNINGS
    // ──────────────────────────────────────────────────────────────

    function claimWinnings(uint256 marketId) external nonReentrant marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.resolved, "Pythia: market not resolved");
        require(userHasBet[marketId][msg.sender], "Pythia: no bet placed");

        uint256 betIndex = userBetIndex[marketId][msg.sender];
        Bet storage bet = marketBets[marketId][betIndex];
        require(!bet.claimed, "Pythia: already claimed");
        bet.claimed = true;

        uint256 payout = 0;

        if (market.outcome == Outcome.INVALID) {
            // Refund full original bet including the platform fee — user shouldn't
            // pay for a market that failed to produce a valid outcome
            payout = bet.originalAmount;
        } else {
            bool won = (market.outcome == Outcome.YES && bet.isYes) ||
                       (market.outcome == Outcome.NO && !bet.isYes);
            if (won) {
                uint256 totalPool = market.yesPool + market.noPool;
                uint256 winningPool = bet.isYes ? market.yesPool : market.noPool;
                payout = (bet.amount * totalPool) / winningPool;
            }
        }

        if (payout > 0) {
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Pythia: transfer failed");
            emit WinningsClaimed(marketId, msg.sender, payout);
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  ATTESTATION (CRE submits Merkle roots computed from real bet data)
    // ──────────────────────────────────────────────────────────────

    /// @notice Submit attestation with Merkle roots computed from actual bet arrays
    /// @dev betsMerkleRoot = keccak256-Merkle over (bettor, amount, isYes) leaves
    ///      payoutsMerkleRoot = keccak256-Merkle over (winner, payout) leaves
    function submitAttestation(
        uint256 marketId,
        bytes32 betsMerkleRoot,
        bytes32 payoutsMerkleRoot,
        uint256 totalPaidOut,
        uint256 winnerCount
    ) external onlyCRE marketExists(marketId) {
        require(markets[marketId].resolved, "Pythia: not resolved");
        require(attestations[marketId].attestedAt == 0, "Pythia: already attested");
        // Sanity: roots must not be zero (prevents garbage values)
        require(betsMerkleRoot != bytes32(0), "Pythia: invalid bets root");
        require(payoutsMerkleRoot != bytes32(0), "Pythia: invalid payouts root");

        attestations[marketId] = ResolutionAttestation({
            betsMerkleRoot: betsMerkleRoot,
            payoutsMerkleRoot: payoutsMerkleRoot,
            totalPaidOut: totalPaidOut,
            winnerCount: winnerCount,
            attestedAt: block.timestamp
        });

        emit AttestationRecorded(marketId, betsMerkleRoot, payoutsMerkleRoot, totalPaidOut);
    }

    function verifyBetInclusion(
        uint256 marketId,
        address bettor,
        uint256 amount,
        bool isYes,
        bytes32[] calldata proof
    ) external view returns (bool) {
        ResolutionAttestation storage att = attestations[marketId];
        require(att.attestedAt > 0, "Pythia: no attestation");
        bytes32 leaf = keccak256(abi.encodePacked(bettor, amount, isYes));
        return _verifyMerkleProof(proof, att.betsMerkleRoot, leaf);
    }

    // ──────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ──────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getMarketBets(uint256 marketId) external view returns (Bet[] memory) {
        return marketBets[marketId];
    }

    function getUserBet(uint256 marketId, address user) external view returns (Bet memory) {
        require(userHasBet[marketId][user], "Pythia: no bet");
        return marketBets[marketId][userBetIndex[marketId][user]];
    }

    function getOdds(uint256 marketId) external view returns (uint256 yesPercent, uint256 noPercent) {
        Market storage m = markets[marketId];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return (50, 50);
        yesPercent = (m.yesPool * 100) / total;
        noPercent = 100 - yesPercent;
    }

    function getActiveMarketIds() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            if (!markets[i].resolved && block.timestamp < markets[i].endTime) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            if (!markets[i].resolved && block.timestamp < markets[i].endTime) {
                ids[idx++] = i;
            }
        }
        return ids;
    }

    function getPendingResolution() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            if (!markets[i].resolved && block.timestamp >= markets[i].resolutionTime) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < marketCount; i++) {
            if (!markets[i].resolved && block.timestamp >= markets[i].resolutionTime) {
                ids[idx++] = i;
            }
        }
        return ids;
    }

    function getAttestation(uint256 marketId) external view returns (ResolutionAttestation memory) {
        return attestations[marketId];
    }

    function getStats() external view returns (
        uint256 _marketCount,
        uint256 _totalVolume,
        uint256 _totalBets,
        uint256 _resolvedMarkets
    ) {
        return (marketCount, totalVolume, totalBets, resolvedMarkets);
    }

    // ──────────────────────────────────────────────────────────────
    //  ADMIN
    // ──────────────────────────────────────────────────────────────

    function setCREWorkflow(address _cre) external onlyOwner {
        require(_cre != address(0), "Pythia: zero address");
        creWorkflow = _cre;
        emit CREWorkflowUpdated(_cre);
    }

    function setWorldId(address _worldId, uint256 _externalNullifier) external onlyOwner {
        require(_worldId != address(0), "Pythia: zero address");
        emit WorldIdUpdated(_worldId, _externalNullifier);
        worldId = IWorldID(_worldId);
        externalNullifier = _externalNullifier;
    }

    /// @notice Withdraw accumulated platform fees (2.5% of all bets)
    function withdrawFees(address to) external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Pythia: fee withdrawal failed");
        emit FeeWithdrawn(to, amount);
    }

    /// @notice Rescue funds permanently locked in a market where the winning side had zero bettors.
    /// @dev    This happens when outcome=YES but yesPool==0 (no YES bettors), making the noPool
    ///         unclaimable. Callable by owner only after 7 days post-resolution.
    function withdrawUnclaimed(uint256 marketId, address to) external onlyOwner marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.resolved, "Pythia: not resolved");
        require(block.timestamp >= market.resolutionTime + 7 days, "Pythia: 7-day claim window not elapsed");
        require(to != address(0), "Pythia: zero address");

        uint256 winningPool = market.outcome == Outcome.YES ? market.yesPool : market.noPool;
        // Only sweep if the winning side had nobody — otherwise normal claims apply
        require(winningPool == 0, "Pythia: winning side has funds — use normal claim");

        uint256 totalPool = market.yesPool + market.noPool;
        require(totalPool > 0, "Pythia: nothing to withdraw");

        // Zero pools before transfer to prevent double-sweep
        market.yesPool = 0;
        market.noPool = 0;

        (bool success, ) = payable(to).call{value: totalPool}("");
        require(success, "Pythia: rescue transfer failed");
    }

    // ──────────────────────────────────────────────────────────────
    //  INTERNAL
    // ──────────────────────────────────────────────────────────────

    function _verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            if (computedHash <= proof[i]) {
                computedHash = keccak256(abi.encodePacked(computedHash, proof[i]));
            } else {
                computedHash = keccak256(abi.encodePacked(proof[i], computedHash));
            }
        }
        return computedHash == root;
    }

    receive() external payable {}
}
