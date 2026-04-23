# test-grid

## Docker image (self-contained)

The published image includes:
- Backend API on port `5000`
- Frontend static files served by the backend
- MySQL server inside the same container
- Automatic schema bootstrap from `docker/mysql/init.sql` on first database initialization only
- Bundled/minified backend runtime (source files are not copied directly into the final image)

## Run container

```bash
docker run -d \
  --name test-grid \
  -p 5000:5000 \
  -v test-grid-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=your-root-password \
  -e MYSQL_DATABASE=test_grid \
  -e MYSQL_USER=testgrid \
  -e MYSQL_PASSWORD=your-db-password \
  -e DB_USER=testgrid \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=test_grid \
  -e JWT_SECRET=your-jwt-secret \
  ghcr.io/as1100k/test-grid:latest
```

Open the app at `http://localhost:5000`.

## Production notes

- Always use a persistent volume for `/var/lib/mysql`.
- Use strong secrets for `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, and `JWT_SECRET`.
- Container startup will fail if placeholder secret values are left unchanged.
- Expose only port `5000` unless direct DB access is required.
- Back up the Docker volume regularly.
- Full source extraction from a delivered container image cannot be made impossible; this setup only raises the effort required.
