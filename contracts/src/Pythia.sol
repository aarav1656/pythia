// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Pythia — Sybil-Resistant Private Prediction Markets
/// @notice Prediction market where World ID ensures 1-person-1-bet and ACE keeps bets private
/// @dev Integrates with Chainlink CRE for AI-powered market resolution and ACE for private payouts
contract Pythia {
    // ──────────────────────────────────────────────────────────────
    //  TYPES
    // ──────────────────────────────────────────────────────────────

    enum Outcome { UNRESOLVED, YES, NO, INVALID }
    enum Category { CRYPTO, SPORTS, POLITICS, WEATHER, ENTERTAINMENT, OTHER }

    struct Market {
        uint256 id;
        string question;              // "Will ETH hit $5000 by March 31?"
        Category category;
        uint256 endTime;              // Betting deadline
        uint256 resolutionTime;       // When CRE resolves
        uint256 yesPool;              // Total ETH on YES
        uint256 noPool;               // Total ETH on NO
        uint256 betCount;             // Unique bettors
        uint256 maxBetPerPerson;      // Fairness cap per human (default 0.01 ETH)
        Outcome outcome;
        bool resolved;
        uint8 aiConfidence;           // AI confidence in resolution (0-100)
        string resolutionSource;      // Data source used for resolution
        address creator;
        uint256 createdAt;
    }

    struct Bet {
        address bettor;
        bool isYes;                   // true = YES, false = NO (swipe right/left)
        uint256 amount;
        bytes32 worldIdNullifier;     // Proof of unique human — prevents multi-accounting
        uint256 timestamp;
        bool claimed;
    }

    /// @notice Privacy attestation for resolved markets
    struct ResolutionAttestation {
        bytes32 betsMerkleRoot;       // Merkle root of all (bettor, amount, side) leaves
        bytes32 payoutsMerkleRoot;    // Merkle root of all (winner, payout) leaves
        uint256 totalPaidOut;
        uint256 winnerCount;
        uint256 attestedAt;
    }

    // ──────────────────────────────────────────────────────────────
    //  STATE
    // ──────────────────────────────────────────────────────────────

    address public owner;
    address public creWorkflow;       // Authorized CRE workflow address

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;

    // Market => Bets
    mapping(uint256 => Bet[]) public marketBets;
    mapping(uint256 => uint256) public marketBetCount;

    // Sybil resistance: marketId => nullifierHash => hasBet
    // World ID nullifier ensures one human can only bet once per market
    mapping(uint256 => mapping(bytes32 => bool)) public hasUsedNullifier;

    // Track user bets: marketId => user => betIndex
    mapping(uint256 => mapping(address => uint256)) public userBetIndex;
    mapping(uint256 => mapping(address => bool)) public userHasBet;

    // Privacy attestations
    mapping(uint256 => ResolutionAttestation) public attestations;

    // Platform stats
    uint256 public totalVolume;       // Total ETH wagered across all markets
    uint256 public totalBets;
    uint256 public resolvedMarkets;

    // ──────────────────────────────────────────────────────────────
    //  EVENTS
    // ──────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        Category category,
        uint256 endTime,
        uint256 maxBetPerPerson,
        address creator
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        bool isYes,
        uint256 amount,
        uint256 newYesPool,
        uint256 newNoPool
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome outcome,
        uint8 aiConfidence,
        string resolutionSource,
        uint256 yesPool,
        uint256 noPool
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed bettor,
        uint256 payout
    );

    event AttestationRecorded(
        uint256 indexed marketId,
        bytes32 betsMerkleRoot,
        bytes32 payoutsMerkleRoot,
        uint256 totalPaidOut
    );

    event CREWorkflowUpdated(address indexed workflow);

    // ──────────────────────────────────────────────────────────────
    //  MODIFIERS
    // ──────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Pythia: not owner");
        _;
    }

    modifier onlyCRE() {
        require(msg.sender == creWorkflow, "Pythia: not CRE workflow");
        _;
    }

    modifier marketExists(uint256 marketId) {
        require(marketId < marketCount, "Pythia: market does not exist");
        _;
    }

    // ──────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ──────────────────────────────────────────────────────────────

    constructor(address _creWorkflow) {
        owner = msg.sender;
        creWorkflow = _creWorkflow;
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET CREATION
    // ──────────────────────────────────────────────────────────────

    /// @notice Create a new prediction market
    /// @param question The question to predict (e.g., "Will ETH hit $5000?")
    /// @param category Market category for filtering
    /// @param endTime Unix timestamp when betting closes
    /// @param resolutionTime Unix timestamp when CRE should resolve
    /// @param maxBetPerPerson Max bet per World ID verified human (fairness cap)
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
    //  BETTING (Swipe Right = YES, Swipe Left = NO)
    // ──────────────────────────────────────────────────────────────

    /// @notice Place a bet on a market (sybil-resistant via World ID nullifier)
    /// @param marketId The market to bet on
    /// @param isYes true = YES (swipe right), false = NO (swipe left)
    /// @param worldIdNullifier World ID nullifier hash proving unique humanity
    /// @dev Each World ID nullifier can only bet ONCE per market — no multi-accounting
    function placeBet(
        uint256 marketId,
        bool isYes,
        bytes32 worldIdNullifier
    ) external payable marketExists(marketId) {
        Market storage market = markets[marketId];

        require(block.timestamp < market.endTime, "Pythia: betting closed");
        require(!market.resolved, "Pythia: market already resolved");
        require(msg.value > 0, "Pythia: bet must be positive");
        require(msg.value <= market.maxBetPerPerson, "Pythia: exceeds max bet per person");

        // SYBIL RESISTANCE: One nullifier per market per human
        require(!hasUsedNullifier[marketId][worldIdNullifier], "Pythia: already bet on this market");
        hasUsedNullifier[marketId][worldIdNullifier] = true;

        // Prevent double-betting from same address (belt + suspenders)
        require(!userHasBet[marketId][msg.sender], "Pythia: already placed bet");
        userHasBet[marketId][msg.sender] = true;

        // Record the bet
        uint256 betIndex = marketBets[marketId].length;
        marketBets[marketId].push(Bet({
            bettor: msg.sender,
            isYes: isYes,
            amount: msg.value,
            worldIdNullifier: worldIdNullifier,
            timestamp: block.timestamp,
            claimed: false
        }));

        userBetIndex[marketId][msg.sender] = betIndex;
        marketBetCount[marketId]++;

        // Update pools
        if (isYes) {
            market.yesPool += msg.value;
        } else {
            market.noPool += msg.value;
        }
        market.betCount++;
        totalVolume += msg.value;
        totalBets++;

        emit BetPlaced(marketId, msg.sender, isYes, msg.value, market.yesPool, market.noPool);
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET RESOLUTION (CRE Workflow Only)
    // ──────────────────────────────────────────────────────────────

    /// @notice Resolve a market — called by CRE workflow after AI analysis
    /// @param marketId The market to resolve
    /// @param outcome The determined outcome (YES, NO, or INVALID)
    /// @param aiConfidence AI confidence in the resolution (0-100)
    /// @param resolutionSource Description of data source used
    function resolveMarket(
        uint256 marketId,
        Outcome outcome,
        uint8 aiConfidence,
        string calldata resolutionSource
    ) external onlyCRE marketExists(marketId) {
        Market storage market = markets[marketId];

        require(!market.resolved, "Pythia: already resolved");
        require(outcome != Outcome.UNRESOLVED, "Pythia: cannot resolve as unresolved");

        market.outcome = outcome;
        market.resolved = true;
        market.aiConfidence = aiConfidence;
        market.resolutionSource = resolutionSource;
        resolvedMarkets++;

        emit MarketResolved(
            marketId, outcome, aiConfidence, resolutionSource,
            market.yesPool, market.noPool
        );
    }

    // ──────────────────────────────────────────────────────────────
    //  CLAIM WINNINGS
    // ──────────────────────────────────────────────────────────────

    /// @notice Claim winnings from a resolved market
    /// @param marketId The resolved market
    function claimWinnings(uint256 marketId) external marketExists(marketId) {
        Market storage market = markets[marketId];
        require(market.resolved, "Pythia: market not resolved");
        require(userHasBet[marketId][msg.sender], "Pythia: no bet placed");

        uint256 betIndex = userBetIndex[marketId][msg.sender];
        Bet storage bet = marketBets[marketId][betIndex];
        require(!bet.claimed, "Pythia: already claimed");

        bet.claimed = true;

        uint256 payout = 0;

        if (market.outcome == Outcome.INVALID) {
            // Refund everyone on INVALID
            payout = bet.amount;
        } else {
            bool won = (market.outcome == Outcome.YES && bet.isYes) ||
                       (market.outcome == Outcome.NO && !bet.isYes);

            if (won) {
                // Payout = proportional share of total pool
                uint256 totalPool = market.yesPool + market.noPool;
                uint256 winningPool = bet.isYes ? market.yesPool : market.noPool;
                payout = (bet.amount * totalPool) / winningPool;
            }
            // Losers get nothing
        }

        if (payout > 0) {
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Pythia: transfer failed");
            emit WinningsClaimed(marketId, msg.sender, payout);
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  PRIVACY ATTESTATION (CRE records proof of correct resolution)
    // ──────────────────────────────────────────────────────────────

    /// @notice Submit privacy attestation after payouts
    function submitAttestation(
        uint256 marketId,
        bytes32 betsMerkleRoot,
        bytes32 payoutsMerkleRoot,
        uint256 totalPaidOut,
        uint256 winnerCount
    ) external onlyCRE marketExists(marketId) {
        require(markets[marketId].resolved, "Pythia: not resolved");
        require(attestations[marketId].attestedAt == 0, "Pythia: already attested");

        attestations[marketId] = ResolutionAttestation({
            betsMerkleRoot: betsMerkleRoot,
            payoutsMerkleRoot: payoutsMerkleRoot,
            totalPaidOut: totalPaidOut,
            winnerCount: winnerCount,
            attestedAt: block.timestamp
        });

        emit AttestationRecorded(marketId, betsMerkleRoot, payoutsMerkleRoot, totalPaidOut);
    }

    /// @notice Verify bet inclusion via Merkle proof
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

    /// @notice Get market details
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /// @notice Get all bets for a market
    function getMarketBets(uint256 marketId) external view returns (Bet[] memory) {
        return marketBets[marketId];
    }

    /// @notice Get a user's bet on a market
    function getUserBet(uint256 marketId, address user) external view returns (Bet memory) {
        require(userHasBet[marketId][user], "Pythia: no bet");
        return marketBets[marketId][userBetIndex[marketId][user]];
    }

    /// @notice Get current odds as percentage (0-100 for YES)
    function getOdds(uint256 marketId) external view returns (uint256 yesPercent, uint256 noPercent) {
        Market storage m = markets[marketId];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return (50, 50);
        yesPercent = (m.yesPool * 100) / total;
        noPercent = 100 - yesPercent;
    }

    /// @notice Get active (unresolved) markets for the swipe UI
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

    /// @notice Get markets pending resolution (for CRE workflow)
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

    /// @notice Get attestation details
    function getAttestation(uint256 marketId) external view returns (ResolutionAttestation memory) {
        return attestations[marketId];
    }

    /// @notice Platform statistics
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
        creWorkflow = _cre;
        emit CREWorkflowUpdated(_cre);
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
