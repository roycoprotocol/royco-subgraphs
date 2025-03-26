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
goldsky subgraph deploy royco-ccdm-destination-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-ccdm-destination-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-ccdm-destination-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-ccdm-destination.yaml
```

### Stop

```bash
goldsky pipeline stop royco-ccdm-destination
```

### Delete

```bash
goldsky pipeline delete royco-ccdm-destination
```
