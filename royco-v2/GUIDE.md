# Guide

## Adding a new network

1. Add the `network.json` file to the `config` directory.

```json
{
  "network": "sepolia",
  "chainId": "11155111",
  "sources": [
    {
      "incentiveLockerAddress": "0x123",
      "incentiveLockerStartBlock": n,
      "umaMerkleChefAVAddress": "0x123",
      "umaMerkleChefAVStartBlock": n,
      "multiplierMarketHubAddress": "0x123",
      "multiplierMarketHubStartBlock": n
    }
  ]
}
```

2. Add the prepare command to package.json

```bash
"prepare:<NETWORK>": "mustache config/<NETWORK>.json config/subgraph.template.yaml > subgraph.yaml && mustache config/<NETWORK>.json config/constants.template.ts > src/utils/constants.ts"
```

3. Add the network to the `networks` array in following bash scripts:

- `deploy-subgraphs.sh`
- `delete-subgraphs.sh`

4. Add the network to `metadata.json`

```json
{
  "metadata": [
    {
      "network": "<NETWORK>",
      "version": "1.0.0"
    }
  ]
}
```

## Adding a new subgraph to existing network

1. Add a new source entry to sources array in `network.json` inside `config` directory.

```json
...
  "sources": [
    ...,
     {
      "incentiveLockerAddress": "0x123",
      "incentiveLockerStartBlock": n,
      "umaMerkleChefAVAddress": "0x123",
      "umaMerkleChefAVStartBlock": n,
      "multiplierMarketHubAddress": "0x123",
      "multiplierMarketHubStartBlock": n
    }
  ]
...
```

## Deploying a new subgraph

1. Delete existing pipeline

```bash
./delete-pipeline.sh
```

2. Deploy new subgraph

```bash
./deploy-subgraphs.sh
```

3. Deploy new pipeline

```bash
./deploy-pipeline.sh
```
