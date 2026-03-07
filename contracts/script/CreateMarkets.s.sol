// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface IPythia {
    enum Category { CRYPTO, SPORTS, POLITICS, WEATHER, ENTERTAINMENT, OTHER }
    function createMarket(
        string calldata question,
        Category category,
        uint256 endTime,
        uint256 resolutionTime,
        uint256 maxBetPerPerson
    ) external returns (uint256);
    function marketCount() external view returns (uint256);
}

/**
 * @title CreateMarkets — seed fresh markets on the deployed Pythia contract
 *
 * Run:
 *   forge script script/CreateMarkets.s.sol:CreateMarkets \
 *     --rpc-url world_chain_sepolia \
 *     --broadcast -vvvv
 */
contract CreateMarkets is Script {
    address constant PYTHIA = 0x6158fa6bA28a664660B3beb4F8992694dbAD4fAC;

    function run() external {
        uint256 key = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(key);

        IPythia pythia = IPythia(PYTHIA);

        uint256 now_ = block.timestamp;
        uint256 day  = 86400;

        // 5 fresh markets — end times 7-60 days from now
        pythia.createMarket(
            "Will ETH break $4,000 before April 2026?",
            IPythia.Category.CRYPTO,
            now_ + 14 * day,
            now_ + 15 * day,
            0.01 ether
        );
        pythia.createMarket(
            "Will Bitcoin reach $100k again in March 2026?",
            IPythia.Category.CRYPTO,
            now_ + 21 * day,
            now_ + 22 * day,
            0.01 ether
        );
        pythia.createMarket(
            "Will the Lakers win their next 3 games?",
            IPythia.Category.SPORTS,
            now_ + 7 * day,
            now_ + 8 * day,
            0.01 ether
        );
        pythia.createMarket(
            "Will a G7 country announce a Bitcoin reserve in 2026?",
            IPythia.Category.POLITICS,
            now_ + 30 * day,
            now_ + 31 * day,
            0.01 ether
        );
        pythia.createMarket(
            "Will the next GTA VI trailer drop before April 2026?",
            IPythia.Category.ENTERTAINMENT,
            now_ + 21 * day,
            now_ + 22 * day,
            0.01 ether
        );

        vm.stopBroadcast();

        console.log("Markets created. Total count:", pythia.marketCount());
    }
}
