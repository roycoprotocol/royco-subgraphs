## Mapping of user's position from source chain to destination chain

1. The `rawPositionRecipe`'s id of each user's position on **royco-recipe** subgraph is linked with `rawWeirollWalletSource`'s id on **royco-ccdm-source** subgraph.

2. The `rawMarketRecipeRefId` of `rawWeirollWalletSource` is linked with `rawMarketRecipeDestination`'s id on **royco-ccdm-destination** subgraph.

3. The `rawWeirollWalletDestinationRefId` of `rawWeirollWalletSource` is linked with `rawWeirollWalletDestination`'s id on **royco-ccdm-destination** subgraph.

4. The `rawWeirollWalletWithdrawnDestinationRefId` of `rawWeirollWalletSource` is linked with `rawWeirollWalletWithdrawnDestination`'s id on **royco-ccdm-destination** subgraph.
