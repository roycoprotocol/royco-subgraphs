## Subgraph Commands

### Deploy Subgraphs

```bash
./deploy-subgraphs.sh
```

### Delete Subgraphs

```bash
./delete-subgraphs.sh
```

### Deploy Pipeline

```bash
./deploy-pipeline.sh
```

### Delete Pipeline

```bash
./delete-pipeline.sh
```

### Prepare, codegen, build

```bash
yarn prepare:<network> && graph codegen && graph build
```

### Deploy

```bash
goldsky subgraph deploy masa-contracts-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause masa-contracts-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete masa-contracts-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply masa-contracts-pipeline.yaml
```

### Stop

```bash
goldsky pipeline stop masa-contracts-pipeline
```

### Delete

```bash
goldsky pipeline delete masa-contracts-pipeline
```

