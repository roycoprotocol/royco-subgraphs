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
goldsky subgraph deploy staked-royusd-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause staked-royusd-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete staked-royusd-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply staked-royusd-pipeline.yaml
```

### Stop

```bash
goldsky pipeline stop staked-royusd-pipeline
```

### Delete

```bash
goldsky pipeline delete staked-royusd-pipeline
```
