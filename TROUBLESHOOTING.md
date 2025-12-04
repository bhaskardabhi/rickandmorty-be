# Troubleshooting Guide

## ERR_CONNECTION_REFUSED Error

If you're getting `ERR_CONNECTION_REFUSED` when the frontend tries to connect to the backend:

### 1. Check if Backend Server is Running

```bash
# Check if port 3001 is in use
lsof -ti:3001

# Or check with curl
curl http://localhost:3001/health
```

### 2. Start the Backend Server

Make sure you're in the backend directory:

```bash
cd rickandmorty-be
npm run dev
```

You should see:
```
Database initialized
Server running on http://localhost:3001
```

### 3. Verify Backend is Accessible

Open a new terminal and test:

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","dbInitialized":true}`

### 4. Check Frontend Configuration

Make sure your frontend `.env.local` has:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 5. Restart Frontend After Config Changes

If you changed `.env.local`, restart the Next.js dev server:

```bash
cd rickandmorty-fe
npm run dev
```

### 6. Common Issues

**Issue: Port already in use**
```bash
# Find what's using port 3001
lsof -ti:3001

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or change the port in .env
PORT=3002
```

**Issue: Database initialization fails**
- Check if DuckDB dependencies are installed
- Check console for error messages

**Issue: CORS errors**
- Backend already has CORS enabled with `app.use(cors())`
- If still having issues, check browser console for specific CORS error

### 7. Running Both Servers

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd rickandmorty-be
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd rickandmorty-fe
npm run dev
```

### 8. Verify Everything Works

1. Backend health check: `http://localhost:3001/health`
2. Frontend: `http://localhost:3000`
3. Navigate to a location page and check if description loads

