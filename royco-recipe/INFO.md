### Available fill amount for AP

**Methodology**

Sum up `token0AmountRemaining` for all `RawOfferRecipe` where:

- `rawMarketRefId` is the global ID of the market
- AND `offerSide` is "1" (because AP fills IP offers)
- AND `tokenClass` is "0" (Input Token)
- AND `expiry` is greater than current timestamp (in seconds)
- AND `isCancelled` is false

### Available fill amount for IP

**Methodology**

Sum up `token0AmountRemaining` for all `RawOfferRecipe` where:

- `rawMarketRefId` is the global ID of the market
- AND `offerSide` is "0" (because IP fills AP offers)
- AND `tokenClass` is "0" (Input Token)
- AND `expiry` is greater than current timestamp (in seconds)
- AND `isCancelled` is false
- AND `isValid` is true

> Note: `isValid` is an extra column that is not coming from subgraph.
