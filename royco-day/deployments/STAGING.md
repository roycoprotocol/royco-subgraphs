== Logs ==
Environment: TEST
Deploying market from config: snUSD

== Protocol scaffolding ==
[deployed] AccessManager 0xC3153cBA0020a914A0e59424e18e420B5ace18Bf
[deployed] Factory (impl) 0xA011CeD5057BA273b7Ed0CB6E67a4b68D6b536Ea
[deployed] Factory (proxy) 0xE9B3356dAc63Cca56fAAAdD9Ba91C41712BF121C
[deployed] EntryPoint (impl) 0x5872a7B98f72039286e9ceCce6CC93D72921D660
[deployed] EntryPoint (proxy) 0xBa140d75fC0b646a13422224099a4F144A4ec9DB
[deployed] MarketSyncer (impl) 0x1143ED0b342e8392105aEd6A65Ab457A5cBd7d88
[deployed] MarketSyncer (proxy)0x883B647c4Dab371A2434553f008d3927ABB275FB

    [applied]   AccessManager role graph
    [deployed] Blacklist (impl)    0x928C1222d066C9E8C44b4d9feeb8020204922029
    [deployed] Blacklist (proxy)   0x2327a358195B9CC7eF06464B228dD3b70b17D3B0
    [deployed] Template            0xB0667EbbA66662fb71265A133a03191EDb4566EE

    marketId (snUSD):

0xb3d433a58a0d62af783a1fcb783e83f5efc3867dfa2e807ed7455be4373d0bda

== Market off-factory contracts (impls, YDMs, pool, pre-deployed proxies) ==
[deployed] SeniorTranche (impl) 0x20806fb74306539e51fA62592Ab02DBD08F5b023
[deployed] SeniorTranche (proxy) 0x371C6778d8B52Ff46DC2329AbE6C7933B8Ebf34B
[deployed] Pool hook (proxy) 0x62571590b319Eaef0715f653f57b2b565F3814b4
[deployed] Balancer E-CLP pool 0x89C9a918351657aBddEe4785ae88590Dbbd4E8d6
[deployed] ConstantPriceFeed (shared) 0x691498671545f299F5E9B836Ce05254Fc94Bf7e6
[deployed] BPT oracle 0x6883F93fc8F14f4a9cfBD0faa68265A29404190a
[deployed] JuniorTranche (impl) 0x276965652Ce5077CA7B4559c9B868ed316f1368b
[deployed] LiquidityTranche (impl) 0x5C1Ca489C9CD3d2763Cc1ecb9F33fFE998867003
[deployed] Accountant (impl) 0x33E9128f45dF8BdD7CF8Eb0AdF3F5E4c512EbaaD
[deployed] Kernel (impl) 0xCf69Fb03AE85F38A54ba54F32d4545Ae0E1833E6
[deployed] JT YDM (shared) 0x515B88b5827421f44c4C967a6A819b8eC7711B26
[deployed] LT LDM (shared) 0x6421e3D535f09996F647A4680F8806b0b9346720

== Market wiring transaction (executeMarketDeployment) ==
[deployed] Kernel (proxy) 0xff9Da59af6a06f228F38c6bbebcd7E70070d4e2b
[deployed] JuniorTranche (proxy) 0x9B6cC7443C33cE5A89aB7800747B1aC2C44c3653
[deployed] LiquidityTranche (proxy) 0xFa0Ff4A396F34eD89A6dEe337db8A4BD377e41cA
[deployed] Accountant (proxy) 0x428D27549e04AE2D7fC4722062fa04beBcA2d5a8
