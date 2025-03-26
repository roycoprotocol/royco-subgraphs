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
goldsky subgraph deploy royco-recipe-<network>/<version> --path .
```

### Pause

```bash
goldsky subgraph pause royco-recipe-<network>/<version>
```

### Delete

```bash
goldsky subgraph delete royco-recipe-<network>/<version>
```

## Pipeline Commands

### Update

```bash
goldsky pipeline apply royco-recipe.yaml
```

### Stop

```bash
goldsky pipeline stop royco-recipe
```

### Delete

```bash
goldsky pipeline delete royco-recipe
```

## Sentio

```bash
npx @sentio/cli graph deploy --owner uday --name royco-recipe-sonic
```
