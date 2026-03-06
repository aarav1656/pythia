// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Pythia.sol";

contract PythiaTest is Test {
    Pythia public pythia;
    address public owner;
    address public creWorkflow;
    address public alice;
    address public bob;
    address public charlie;

    uint256 public constant MAX_BET = 0.01 ether;

    function setUp() public {
        owner = address(this);
        creWorkflow = address(0xC4E);
        alice = address(0xA11CE);
        bob = address(0xB0B);
        charlie = address(0xC4A4);

        pythia = new Pythia(creWorkflow);

        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET CREATION
    // ──────────────────────────────────────────────────────────────

    function test_CreateMarket() public {
        uint256 id = pythia.createMarket(
            "Will ETH hit $5000?",
            Pythia.Category.CRYPTO,
            block.timestamp + 1 days,
            block.timestamp + 2 days,
            MAX_BET
        );

        assertEq(id, 0);
        assertEq(pythia.marketCount(), 1);

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(m.question, "Will ETH hit $5000?");
        assertEq(uint(m.category), uint(Pythia.Category.CRYPTO));
        assertEq(m.maxBetPerPerson, MAX_BET);
        assertFalse(m.resolved);
        assertEq(uint(m.outcome), uint(Pythia.Outcome.UNRESOLVED));
    }

    function test_CreateMultipleMarkets() public {
        pythia.createMarket("Market 1", Pythia.Category.CRYPTO, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);
        pythia.createMarket("Market 2", Pythia.Category.SPORTS, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);
        pythia.createMarket("Market 3", Pythia.Category.WEATHER, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);

        assertEq(pythia.marketCount(), 3);
    }

    function test_RevertCreateMarket_EndTimeInPast() public {
        vm.expectRevert("Pythia: end time must be in future");
        pythia.createMarket("Bad", Pythia.Category.CRYPTO, block.timestamp - 1, block.timestamp + 1, MAX_BET);
    }

    function test_RevertCreateMarket_ResolutionBeforeEnd() public {
        vm.expectRevert("Pythia: resolution must be after end");
        pythia.createMarket("Bad", Pythia.Category.CRYPTO, block.timestamp + 2 days, block.timestamp + 1 days, MAX_BET);
    }

    function test_RevertCreateMarket_EmptyQuestion() public {
        vm.expectRevert("Pythia: question cannot be empty");
        pythia.createMarket("", Pythia.Category.CRYPTO, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);
    }

    function test_RevertCreateMarket_ZeroMaxBet() public {
        vm.expectRevert("Pythia: max bet must be positive");
        pythia.createMarket("Q?", Pythia.Category.CRYPTO, block.timestamp + 1 days, block.timestamp + 2 days, 0);
    }

    // ──────────────────────────────────────────────────────────────
    //  BETTING
    // ──────────────────────────────────────────────────────────────

    function test_PlaceBet_Yes() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(m.yesPool, MAX_BET);
        assertEq(m.noPool, 0);
        assertEq(m.betCount, 1);

        Pythia.Bet memory b = pythia.getUserBet(0, alice);
        assertTrue(b.isYes);
        assertEq(b.amount, MAX_BET);
    }

    function test_PlaceBet_No() public {
        _createDefaultMarket();

        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(m.yesPool, 0);
        assertEq(m.noPool, MAX_BET);
    }

    function test_MultipleBettors() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        vm.prank(charlie);
        pythia.placeBet{value: 0.005 ether}(0, true, bytes32(uint256(3)));

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(m.yesPool, MAX_BET + 0.005 ether);
        assertEq(m.noPool, MAX_BET);
        assertEq(m.betCount, 3);
    }

    function test_RevertBet_DuplicateNullifier() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        // Same nullifier from different address = sybil attempt
        vm.prank(bob);
        vm.expectRevert("Pythia: already bet on this market");
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(1)));
    }

    function test_RevertBet_SameAddressTwice() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        vm.prank(alice);
        vm.expectRevert("Pythia: already placed bet");
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(99)));
    }

    function test_RevertBet_ExceedsMaxBet() public {
        _createDefaultMarket();

        vm.prank(alice);
        vm.expectRevert("Pythia: exceeds max bet per person");
        pythia.placeBet{value: MAX_BET + 1}(0, true, bytes32(uint256(1)));
    }

    function test_RevertBet_MarketClosed() public {
        _createDefaultMarket();

        vm.warp(block.timestamp + 2 days);

        vm.prank(alice);
        vm.expectRevert("Pythia: betting closed");
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
    }

    function test_RevertBet_ZeroAmount() public {
        _createDefaultMarket();

        vm.prank(alice);
        vm.expectRevert("Pythia: bet must be positive");
        pythia.placeBet{value: 0}(0, true, bytes32(uint256(1)));
    }

    function test_NullifierWorksAcrossMarkets() public {
        _createDefaultMarket(); // market 0
        pythia.createMarket("Q2?", Pythia.Category.SPORTS, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);

        // Same nullifier on different markets = OK (one bet per market)
        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(1, false, bytes32(uint256(1)));

        assertEq(pythia.getMarket(0).betCount, 1);
        assertEq(pythia.getMarket(1).betCount, 1);
    }

    // ──────────────────────────────────────────────────────────────
    //  ODDS CALCULATION
    // ──────────────────────────────────────────────────────────────

    function test_Odds_NoPool() public {
        _createDefaultMarket();

        (uint256 yesP, uint256 noP) = pythia.getOdds(0);
        assertEq(yesP, 50);
        assertEq(noP, 50);
    }

    function test_Odds_EqualPools() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        (uint256 yesP, uint256 noP) = pythia.getOdds(0);
        assertEq(yesP, 50);
        assertEq(noP, 50);
    }

    function test_Odds_HeavyYes() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(2)));
        vm.prank(charlie);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(3)));

        (uint256 yesP, uint256 noP) = pythia.getOdds(0);
        assertEq(yesP, 66); // 2/3
        assertEq(noP, 34);
    }

    // ──────────────────────────────────────────────────────────────
    //  MARKET RESOLUTION
    // ──────────────────────────────────────────────────────────────

    function test_ResolveMarket_Yes() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "CoinGecko + OpenRouter AI");

        Pythia.Market memory m = pythia.getMarket(0);
        assertTrue(m.resolved);
        assertEq(uint(m.outcome), uint(Pythia.Outcome.YES));
        assertEq(m.aiConfidence, 95);
        assertEq(m.resolutionSource, "CoinGecko + OpenRouter AI");
    }

    function test_ResolveMarket_No() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.NO, 88, "Weather API");

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(uint(m.outcome), uint(Pythia.Outcome.NO));
    }

    function test_ResolveMarket_Invalid() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.INVALID, 30, "Conflicting data sources");

        Pythia.Market memory m = pythia.getMarket(0);
        assertEq(uint(m.outcome), uint(Pythia.Outcome.INVALID));
    }

    function test_RevertResolve_NotCRE() public {
        _createDefaultMarket();

        vm.prank(alice);
        vm.expectRevert("Pythia: not CRE workflow");
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");
    }

    function test_RevertResolve_AlreadyResolved() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        vm.prank(creWorkflow);
        vm.expectRevert("Pythia: already resolved");
        pythia.resolveMarket(0, Pythia.Outcome.NO, 50, "source");
    }

    function test_RevertResolve_Unresolved() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        vm.expectRevert("Pythia: cannot resolve as unresolved");
        pythia.resolveMarket(0, Pythia.Outcome.UNRESOLVED, 50, "source");
    }

    // ──────────────────────────────────────────────────────────────
    //  WINNINGS / PAYOUTS
    // ──────────────────────────────────────────────────────────────

    function test_ClaimWinnings_Winner() public {
        _createDefaultMarket();

        // Alice bets YES, Bob bets NO
        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        // Resolve as YES — Alice wins
        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        pythia.claimWinnings(0);

        // Alice should get total pool (0.02 ETH)
        assertEq(alice.balance - aliceBefore, 0.02 ether);
    }

    function test_ClaimWinnings_Loser() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        // Resolve as YES — Bob loses
        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        pythia.claimWinnings(0);

        // Bob gets nothing
        assertEq(bob.balance, bobBefore);
    }

    function test_ClaimWinnings_Invalid_RefundAll() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        // Resolve as INVALID — everyone gets refunded
        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.INVALID, 30, "conflicting data");

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        pythia.claimWinnings(0);
        assertEq(alice.balance - aliceBefore, MAX_BET); // refund

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        pythia.claimWinnings(0);
        assertEq(bob.balance - bobBefore, MAX_BET); // refund
    }

    function test_RevertClaim_NotResolved() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        vm.prank(alice);
        vm.expectRevert("Pythia: market not resolved");
        pythia.claimWinnings(0);
    }

    function test_RevertClaim_NoBet() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        vm.prank(alice);
        vm.expectRevert("Pythia: no bet placed");
        pythia.claimWinnings(0);
    }

    function test_RevertClaim_DoubleClaim() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        vm.prank(alice);
        pythia.claimWinnings(0);

        vm.prank(alice);
        vm.expectRevert("Pythia: already claimed");
        pythia.claimWinnings(0);
    }

    function test_ProportionalPayout_MultipleWinners() public {
        _createDefaultMarket();

        // Alice bets 0.01 YES, Charlie bets 0.005 YES, Bob bets 0.01 NO
        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));
        vm.prank(charlie);
        pythia.placeBet{value: 0.005 ether}(0, true, bytes32(uint256(3)));
        vm.prank(bob);
        pythia.placeBet{value: MAX_BET}(0, false, bytes32(uint256(2)));

        // Total pool = 0.025 ETH, YES pool = 0.015 ETH
        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        // Alice payout: (0.01 * 0.025) / 0.015 = 0.01666... ETH
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        pythia.claimWinnings(0);
        uint256 alicePayout = alice.balance - aliceBefore;
        assertGt(alicePayout, MAX_BET); // More than her bet
        assertLt(alicePayout, 0.025 ether); // Less than total pool

        // Charlie payout: (0.005 * 0.025) / 0.015 = 0.00833... ETH
        uint256 charlieBefore = charlie.balance;
        vm.prank(charlie);
        pythia.claimWinnings(0);
        uint256 charliePayout = charlie.balance - charlieBefore;
        assertGt(charliePayout, 0.005 ether);
    }

    // ──────────────────────────────────────────────────────────────
    //  PRIVACY ATTESTATION
    // ──────────────────────────────────────────────────────────────

    function test_SubmitAttestation() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        vm.prank(creWorkflow);
        pythia.submitAttestation(0, bytes32(uint256(111)), bytes32(uint256(222)), 0.02 ether, 1);

        Pythia.ResolutionAttestation memory att = pythia.getAttestation(0);
        assertEq(att.betsMerkleRoot, bytes32(uint256(111)));
        assertEq(att.totalPaidOut, 0.02 ether);
        assertGt(att.attestedAt, 0);
    }

    function test_RevertAttestation_NotResolved() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        vm.expectRevert("Pythia: not resolved");
        pythia.submitAttestation(0, bytes32(uint256(111)), bytes32(uint256(222)), 0.02 ether, 1);
    }

    function test_RevertAttestation_Duplicate() public {
        _createDefaultMarket();

        vm.prank(creWorkflow);
        pythia.resolveMarket(0, Pythia.Outcome.YES, 95, "source");

        vm.prank(creWorkflow);
        pythia.submitAttestation(0, bytes32(uint256(111)), bytes32(uint256(222)), 0.02 ether, 1);

        vm.prank(creWorkflow);
        vm.expectRevert("Pythia: already attested");
        pythia.submitAttestation(0, bytes32(uint256(333)), bytes32(uint256(444)), 0.01 ether, 1);
    }

    // ──────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ──────────────────────────────────────────────────────────────

    function test_GetActiveMarketIds() public {
        pythia.createMarket("Q1?", Pythia.Category.CRYPTO, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);
        pythia.createMarket("Q2?", Pythia.Category.SPORTS, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);

        uint256[] memory active = pythia.getActiveMarketIds();
        assertEq(active.length, 2);
    }

    function test_GetPendingResolution() public {
        pythia.createMarket("Q1?", Pythia.Category.CRYPTO, block.timestamp + 1 days, block.timestamp + 2 days, MAX_BET);

        uint256[] memory pending = pythia.getPendingResolution();
        assertEq(pending.length, 0);

        // Warp past resolution time
        vm.warp(block.timestamp + 3 days);
        pending = pythia.getPendingResolution();
        assertEq(pending.length, 1);
    }

    function test_Stats() public {
        _createDefaultMarket();

        vm.prank(alice);
        pythia.placeBet{value: MAX_BET}(0, true, bytes32(uint256(1)));

        (uint256 mc, uint256 tv, uint256 tb, uint256 rm) = pythia.getStats();
        assertEq(mc, 1);
        assertEq(tv, MAX_BET);
        assertEq(tb, 1);
        assertEq(rm, 0);
    }

    // ──────────────────────────────────────────────────────────────
    //  ADMIN
    // ──────────────────────────────────────────────────────────────

    function test_SetCREWorkflow() public {
        address newCRE = address(0xDEAD);
        pythia.setCREWorkflow(newCRE);
        assertEq(pythia.creWorkflow(), newCRE);
    }

    function test_RevertSetCRE_NotOwner() public {
        vm.prank(alice);
        vm.expectRevert("Pythia: not owner");
        pythia.setCREWorkflow(address(0xDEAD));
    }

    // ──────────────────────────────────────────────────────────────
    //  HELPERS
    // ──────────────────────────────────────────────────────────────

    function _createDefaultMarket() internal returns (uint256) {
        return pythia.createMarket(
            "Will ETH hit $5000?",
            Pythia.Category.CRYPTO,
            block.timestamp + 1 days,
            block.timestamp + 2 days,
            MAX_BET
        );
    }
}
