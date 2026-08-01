Environment: TEST
Deploying market from config: srRoyUSDC

== Protocol scaffolding ==
[deployed] AccessManager 0x91fe64865cb282248a7ed79110a8f18ff5638fc3
[deployed] CREATE3 deployer 0x619d8189024545c612015039f82513622efe0683
[deployed] Gatekeeper 0x99879166d678153865200db5ca3f8f248a1f55b7
[deployed] Factory (impl) 0x7e9c5cd020538a4fa08313017ca6e4a8a260cc78
[deployed] Factory (proxy) 0xbb7c9faa185f3640cff8c1b6d0fb2b86d7f1c3c7
[deployed] EntryPoint (impl) 0x588568920862e7d0069a9a8042f733aa8ea9342a
[deployed] EntryPoint (proxy) 0xa436cd30531c3291b126f95fbe85ab29d271a48f
[deployed] MarketSyncer (impl) 0x8a247739d0a0a2bd74d2bfa8637750210ef4edce
[deployed] MarketSyncer (proxy) 0x635c5378d5ed607731699d9d36d5b36b2c27f797
[applied] AccessManager role graph
[deployed] Blacklist (impl) 0xa3ac1e27bbc852efd7513ef54c4e663202db0221
[deployed] Blacklist (proxy) 0xb575f92a1a455e71f368e0cdf1ac3405c9f64c43
[deployed] Template 0x3d4d769e69e13731bea1f770ad0a56a836629793
marketId (srRoyUSDC):
0x8c43dbad1f634ea5eb8dce7ec0ea5b33fa8dff3bd933ad0ade589b072b8bb8c8

== Collateral asset oracle ==
[deployed] CollateralAssetOracle 0xfdeb569c32648414449f6372588740096d0b8584

== Market off-factory contracts (impls, YDMs, pool, pre-deployed proxies) ==
[deployed] SeniorTranche (impl) 0x1211700871090a2e0e133657c3f0a075791f3d16
[deployed] SeniorTranche (proxy) 0x83eaa39ea8b8120e42bc7db3acd0950e1f7c19d5
[deployed] Pool hook (proxy) 0xa3254b11b683d7bb89cc168fc48f4ac4a76b74dd
[deployed] Balancer E-CLP pool 0x601f5b02caa2113943590d21786eb0b9ab9dd26f
[deployed] ConstantPriceFeed (shared) 0x1ba932a47dcf3dbf9736226513292b27b047cc54
[deployed] BPT oracle 0x631e0b61d01d80d5d2632618a0e2023a3f33de2f
[deployed] JuniorTranche (impl) 0xf378730929839669421e5c2bce329f3892df3f55
[deployed] LiquidityProviderTranche (impl) 0x83cada14b11a408b0b47a5ba8b39ed64bfbac2a2
[deployed] Accountant (impl) 0x72bd4b721d8c2ab02037e534708d69792f477f7e
[deployed] Kernel (impl) 0xbb2255a4c115b6bd958e60055fbac873bac7e533
[reused] JT YDM (shared) 0x515b88b5827421f44c4c967a6a819b8ec7711b26
[reused] LPT LDM (shared) 0x6421e3d535f09996f647a4680f8806b0b9346720

== Market wiring transaction (executeMarketDeployment) ==
[deployed] Kernel (proxy) 0x8794ac95f9a01bd49e6dddcecf1e3f71b79a32f4
[deployed] JuniorTranche (proxy) 0xd010c57e81e1c97e5afe39d3e3a5acfc2b7338e1
[deployed] LiquidityProviderTranche (proxy) 0x92d7fdd4c4a8bf8441e0bd36bf4511b77babf1a4
[deployed] Accountant (proxy) 0xb32652703a40a43166b3968fd20246eae0f39b4f
