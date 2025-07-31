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
goldsky subgraph deploy royco-merkle-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-merkle-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-merkle-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-merkle.yaml
```

### Stop

```bash
goldsky pipeline stop royco-merkle
```

### Delete

```bash
goldsky pipeline delete royco-merkle
```
