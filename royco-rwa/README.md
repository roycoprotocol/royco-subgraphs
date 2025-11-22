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
goldsky subgraph deploy royco-rwa-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-rwa-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-rwa-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-rwa-pipeline.yaml
```

### Stop

```bash
goldsky pipeline stop royco-rwa-pipeline
```

### Delete

```bash
goldsky pipeline delete royco-rwa-pipeline
```
