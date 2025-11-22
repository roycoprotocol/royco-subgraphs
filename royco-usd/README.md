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
goldsky subgraph deploy royusd-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royusd-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royusd-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royusd-pipeline.yaml
```

### Stop

```bash
goldsky pipeline stop royusd-pipeline
```

### Delete

```bash
goldsky pipeline delete royusd-pipeline
```
