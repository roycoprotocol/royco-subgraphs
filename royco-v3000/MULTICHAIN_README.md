# Multichain Configuration Guide

## Current Status
The indexer is now configured for multichain support with the following setup:

### Configuration Structure
- ✅ `unordered_multichain_mode: true` enabled
- ✅ ABI file paths specified for each contract
- ✅ Network templates ready for additional chains

### Adding New Networks

To add a new network, uncomment and configure one of the network templates in `config.yaml`:

```yaml
- id: 1 # Ethereum Mainnet
  start_block: 0
  contracts:
    - name: RoycoAccountFactory
      address: 
        - "0x..." # Add mainnet factory address
    - name: ISafe
    - name: ERC20
```

### Supported Networks (Ready to Enable)
- **Ethereum Mainnet** (id: 1)
- **Polygon** (id: 137) 
- **Base** (id: 8453)
- **Arbitrum** (id: 42161)
- **Optimism** (id: 10)

### Handler Updates
The handlers are fully updated for multichain:
- ✅ Chain ID logging includes chain context
- ✅ All handlers now use dynamic `event.chainId` instead of hardcoded CHAIN_ID
- ✅ Utility functions updated to accept chainId parameters
- ✅ TypeScript compilation successful

### Next Steps for Full Multichain
1. **Deploy Royco contracts** on target networks
2. **Update contract addresses** in config.yaml for additional networks
3. **Test with multiple networks** when contracts are deployed

### Entity ID Structure
Entities are automatically namespaced by chain ID:
- `${chainId}_${address}` for Safe entities
- `${chainId}-${tokenAddress}` for token entities

This prevents ID collisions across chains.