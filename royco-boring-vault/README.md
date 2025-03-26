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
goldsky subgraph deploy royco-boring-vault-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-boring-vault-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-boring-vault-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-boring-vault-pipeline.yaml
```

### Stop

```bash
goldsky pipeline stop royco-boring-vault-pipeline
```

### Delete

```bash
goldsky pipeline delete royco-boring-vault-pipeline
```
