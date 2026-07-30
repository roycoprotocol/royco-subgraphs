== Logs ==
Environment: TEST
Deploying market from config: srRoyUSDC

== Protocol scaffolding ==
[deployed] AccessManager 0xdb4fb8f3160fc4689db5db33f82eabb99812ddb9
[deployed] CREATE3 deployer 0x29af81b890ce3f6eb0440de9f3b3757dbda61f73
[deployed] Gatekeeper 0xc540b3a99551fc06bb90fea72167f3039730a474
[deployed] Factory (impl) 0x2e5676c41d811540dac5c0f6a8754d6e16deb46e
[deployed] Factory (proxy) 0xaabc4cfb4260066cef4ec23a46155d98082d23e6
[deployed] EntryPoint (impl) 0x76f237b4cdee3f5821ce69fc02ce8d37c8dcf4f0
[deployed] EntryPoint (proxy) 0x33405d7e7e2a1ae3676893751d958a5c3a288f3f
[reused] MarketSyncer (impl) 0x1143ed0b342e8392105aed6a65ab457a5cbd7d88
[deployed] MarketSyncer (proxy) 0xc8dc2c1857410e75121c3e5e1c8bad609fc70cb1
[applied] AccessManager role graph
[reused] Blacklist (impl) 0x928c1222d066c9e8c44b4d9feeb8020204922029
[deployed] Blacklist (proxy) 0xdba4270d87334ed47e561892124a9ffc64b884c8
[deployed] Template 0x26110caac159945efef5b0d40239a786b6e4a7e9
marketId (srRoyUSDC):
0x69f3674bba0732d8f87acb82d735ce11745231081609d55b3bad682866c00df6

== Collateral asset oracle ==
[deployed] CollateralAssetOracle 0x94a8a05cea87a6fde7a95bb83573c62d7ea72213

== Market off-factory contracts (impls, YDMs, pool, pre-deployed proxies) ==
[deployed] SeniorTranche (impl) 0x4a3de06cd939b13f89487002f6b2ebdab19e5697
[deployed] SeniorTranche (proxy) 0x9607957e1468faee859a7b3ccfeff2710190b8fb
[deployed] Pool hook (proxy) 0x7deaaac51a04f65d83366059028dd82e65bd11b4
[deployed] Balancer E-CLP pool 0xa2f1364c229d69b40254623531a867dad3489b7d
[reused] ConstantPriceFeed (shared) 0x691498671545f299f5e9b836ce05254fc94bf7e6
[deployed] BPT oracle 0x631e0b61d01d80d5d2632618a0e2023a3f33de2f
[deployed] JuniorTranche (impl) 0x65a541e5839815188733fe3a311d545e1e7976e6
[deployed] LiquidityProviderTranche (impl) 0xa9a2d9f21ff2ff4c2432d345d276b655709cac50
[deployed] Accountant (impl) 0x924762d8a189457bbca0da9bbe256769b2cae271
[deployed] Kernel (impl) 0x0eb2fff175506de24942e821ad14a56493974155
[reused] JT YDM (shared) 0x515b88b5827421f44c4c967a6a819b8ec7711b26
[reused] LPT LDM (shared) 0x6421e3d535f09996f647a4680f8806b0b9346720

== Market wiring transaction (executeMarketDeployment) ==
[deployed] Kernel (proxy) 0x6932ef720eddc7b4bc4e367bfb0388f6202cbe0c
[deployed] JuniorTranche (proxy) 0xff7d7d8f7941ede73ecc6e9042150158ee7362ae
[deployed] LiquidityProviderTranche (proxy) 0x3b8115aca5c1405eef49f0aec4a080ef6fbc8b82
[deployed] Accountant (proxy) 0xa5fa225afb653c03a9fbea2194e4ad30fa548a7e
