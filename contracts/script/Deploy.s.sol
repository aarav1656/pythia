// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Pythia} from "../src/Pythia.sol";

/**
 * @title Deploy Pythia to World Chain Sepolia
 *
 * Required env vars:
 *   PRIVATE_KEY            — deployer private key (with World Chain Sepolia ETH)
 *   WORLD_ID_ROUTER        — World ID router (default: 0x57f928158C3EE7CDad1e4D8642503c4D0201f611)
 *   EXTERNAL_NULLIFIER     — keccak256(abi.encodePacked(appId, actionId)) >> 8
 *   CRE_WORKFLOW           — Chainlink CRE workflow address (use address(0) initially, set later)
 *
 * Run:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url world_chain_sepolia \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract Deploy is Script {
    // World ID router on World Chain Sepolia
    // Source: https://docs.world.org/world-chain/addresses
    address constant WORLD_ID_ROUTER_SEPOLIA = 0x57f928158C3EE7CDad1e4D8642503c4D0201f611;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address worldId = vm.envOr("WORLD_ID_ROUTER", WORLD_ID_ROUTER_SEPOLIA);
        uint256 externalNullifier = vm.envUint("EXTERNAL_NULLIFIER");
        address creWorkflow = vm.envOr("CRE_WORKFLOW", address(0));

        vm.startBroadcast(deployerKey);

        Pythia pythia = new Pythia(creWorkflow, worldId, externalNullifier);

        vm.stopBroadcast();

        console.log("Pythia deployed to:", address(pythia));
        console.log("Owner:            ", vm.addr(deployerKey));
        console.log("World ID router:  ", worldId);
        console.log("externalNullifier:", externalNullifier);
        console.log("CRE workflow:     ", creWorkflow);
        console.log("");
        console.log("Update frontend/src/lib/contracts.ts:");
        console.log("  pythia: '%s'", address(pythia));
    }
}
