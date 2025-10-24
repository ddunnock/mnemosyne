# Docker Setup for PostgreSQL + pgvector

**Audience**: 🏢 Admin
**Difficulty**: 🟡 Intermediate

This guide helps you set up PostgreSQL with the pgvector extension using Docker for Mnemosyne vector storage.

## Prerequisites

- Docker installed and running ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose v1.27.0+ (usually included with Docker Desktop)

## Quick Start

### 1. Start PostgreSQL

```bash
# From the Mnemosyne repository root
docker-compose up -d postgres
```

This will:
- Download the `pgvector/pgvector:pg16` image (first time only)
- Create a PostgreSQL container with pgvector extension
- Start the database on `localhost:5432`
- Create persistent storage for your data

### 2. Verify PostgreSQL is Running

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres
```

Expected output: `postgres:5432 - accepting connections`

### 3. Configure Mnemosyne

1. Open Obsidian
2. Go to **Settings → Mnemosyne → Vector Store**
3. Select **PostgreSQL + pgvector** from backend dropdown
4. Enter connection details:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `mnemosyne`
   - **User**: `postgres`
   - **Password**: `changeme` (default - change in production!)
   - **SSL**: Disabled (for local setup)
5. Click **Test Connection**
6. Click **Save Configuration**

### 4. Migrate Existing Data (Optional)

If you have existing data in JSON or SQLite:

1. In Vector Store settings, click **Migrate to PostgreSQL**
2. Wait for migration to complete
3. Verify chunk count matches your previous backend

## Default Credentials

**Important**: Change these in production!

- **Database**: `mnemosyne`
- **User**: `postgres`
- **Password**: `changeme`

To change the password:

1. Edit `docker-compose.yml`:
   ```yaml
   environment:
     POSTGRES_PASSWORD: your-secure-password
   ```

2. Recreate the container:
   ```bash
   docker-compose down
   docker volume rm mnemosyne_pgdata  # WARNING: Deletes all data!
   docker-compose up -d postgres
   ```

## Optional: pgAdmin (Web-based Database Manager)

pgAdmin is included but commented out by default.

### Enable pgAdmin

1. Start pgAdmin:
   ```bash
   docker-compose up -d pgadmin
   ```

2. Access at: http://localhost:5050
   - **Email**: `admin@mnemosyne.local`
   - **Password**: `changeme`

3. Add PostgreSQL server:
   - Right-click **Servers** → **Register** → **Server**
   - **General** tab:
     - Name: `Mnemosyne`
   - **Connection** tab:
     - Host: `postgres` (Docker network name)
     - Port: `5432`
     - Database: `mnemosyne`
     - Username: `postgres`
     - Password: `changeme`

## Management Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Just PostgreSQL
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 postgres
```

### Stop Services

```bash
# Stop all services (data is preserved)
docker-compose down

# Stop specific service
docker-compose stop postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres mnemosyne > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres mnemosyne < backup.sql
```

### Access PostgreSQL Shell

```bash
# Interactive psql
docker-compose exec postgres psql -U postgres -d mnemosyne

# Run single command
docker-compose exec postgres psql -U postgres -d mnemosyne -c "SELECT COUNT(*) FROM embeddings;"
```

### Check Vector Extension

```bash
docker-compose exec postgres psql -U postgres -d mnemosyne -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

Expected output:
```
 oid  | extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition
------+---------+----------+--------------+----------------+------------+-----------+--------------
 16387 | vector  |       10 |         2200 | t              | 0.5.1      |           |
```

## Performance Tuning

The included `docker-compose.yml` has reasonable defaults for most users. For large vaults:

### Increase Memory

Edit `docker-compose.yml`:

```yaml
environment:
  POSTGRES_SHARED_BUFFERS: 512MB      # 1/4 of total RAM recommended
  POSTGRES_WORK_MEM: 128MB            # Per query memory
  POSTGRES_MAINTENANCE_WORK_MEM: 256MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 2GB  # 1/2 to 3/4 of total RAM
```

### Enable Resource Limits

Uncomment the `deploy` section in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 1G
```

### Restart After Changes

```bash
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs postgres

# Common issues:
# - Port 5432 already in use (stop other PostgreSQL instances)
# - Insufficient disk space
# - Permission issues with volumes
```

### Connection Refused

```bash
# Verify container is running
docker-compose ps

# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U postgres

# Check port binding
docker-compose port postgres 5432
```

### Slow Performance

1. **Check container resources:**
   ```bash
   docker stats mnemosyne-postgres
   ```

2. **Verify indexes exist:**
   ```bash
   docker-compose exec postgres psql -U postgres -d mnemosyne -c "\di"
   ```

3. **Check query performance:**
   ```bash
   docker-compose exec postgres psql -U postgres -d mnemosyne
   # Then run:
   EXPLAIN ANALYZE SELECT * FROM embeddings LIMIT 10;
   ```

### Reset Everything

**Warning**: This deletes ALL data!

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes data)
docker volume rm mnemosyne_pgdata

# Start fresh
docker-compose up -d postgres
```

## Production Deployment

For production use:

1. **Change default passwords** in `docker-compose.yml`
2. **Enable SSL** - mount certificates and configure PostgreSQL
3. **Set up backups** - Use pg_dump or WAL archiving
4. **Monitor resources** - Set up Docker monitoring
5. **Use external volumes** - Mount to reliable storage
6. **Configure firewall** - Restrict access to port 5432
7. **Keep updated** - Regularly update the pgvector image

### Example Production Configuration

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - /mnt/data/postgres:/var/lib/postgresql/data
      - /etc/ssl/certs:/etc/ssl/certs:ro
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G

secrets:
  db_password:
    file: ./db_password.txt
```

## Additional Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Docker Documentation](https://hub.docker.com/_/postgres)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Related Documentation

- **[Vector Store Backends](./vector-store-backends.md)** - Comparison of JSON, SQLite, PostgreSQL
- **[Vector Store Implementation](../developer/vector-store-implementation.md)** - Architecture details
- **[Getting Started](../user-guides/getting-started.md)** - Initial setup guide

---

**Version**: 1.0+
**Last Updated**: 2025-10-24
**Tested With**: PostgreSQL 16, pgvector 0.5.1
