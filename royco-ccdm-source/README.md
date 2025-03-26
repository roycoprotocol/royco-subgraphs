## Subgraph Commands

### Delete Subgraphs Bash Script

```bash
./delete-subgraphs.sh
```

### Deploy New Subgraphs Bash Script

```bash
./deploy-subgraphs.sh
```

### Prepare, codegen, build

```bash
yarn prepare:<network> && graph codegen && graph build
```

### Deploy

```bash
goldsky subgraph deploy royco-ccdm-source-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-ccdm-source-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-ccdm-source-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-ccdm-source.yaml
```

### Stop

```bash
goldsky pipeline stop royco-ccdm-source
```

### Delete

```bash
goldsky pipeline delete royco-ccdm-source
```
