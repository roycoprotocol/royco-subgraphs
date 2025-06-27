# Royco V3000 Indexer Setup

This setup is configured to run the Envio indexer directly without Docker, connecting to an external PostgreSQL database.

## Prerequisites

1. **Node.js 18+** installed
2. **External PostgreSQL database** accessible
3. **Environment variables** configured

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Configure Environment Variables
Copy the example environment file and update with your database details:
```bash
cp .env.example .env
```

Edit `.env` file with your PostgreSQL connection details:
```bash
# External PostgreSQL Configuration
ENVIO_PG_HOST=your-database-host
ENVIO_PG_PORT=5432
ENVIO_PG_USER=your-username
ENVIO_PG_PASSWORD=your-password
ENVIO_PG_DATABASE=your-database-name
```

### 3. Build and Generate Code
```bash
# Build TypeScript
npm run build

# Generate Envio code
npm run codegen
```

### 4. Run the Indexer
```bash
# Start the indexer
npm start

# Or run in development mode
npm run dev
```

## Configuration

### Database Setup
The indexer will automatically create the necessary tables in your PostgreSQL database on first run.

### Multichain Support
The indexer is configured for multichain support. To add new networks:

1. Edit `config.yaml`
2. Uncomment a network template
3. Add the contract addresses for that network
4. Restart the indexer

### Monitoring
- Logs will show indexing progress
- Check the console output for any errors
- Database tables will be populated as events are processed

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIO_PG_HOST` | PostgreSQL host | localhost |
| `ENVIO_PG_PORT` | PostgreSQL port | 5432 |
| `ENVIO_PG_USER` | PostgreSQL username | postgres |
| `ENVIO_PG_PASSWORD` | PostgreSQL password | - |
| `ENVIO_PG_DATABASE` | PostgreSQL database | envio-dev |
| `LOG_LEVEL` | Logging level | info |
| `TUI_OFF` | Disable terminal UI | true |

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running and accessible
- Check firewall/network settings
- Ensure database user has proper permissions

### Build Issues
- Run `npm run clean` then rebuild
- Check Node.js version (requires 18+)
- Clear node_modules and reinstall

### Indexing Issues
- Check RPC endpoints are accessible
- Verify contract addresses in config.yaml
- Check logs for specific error messages