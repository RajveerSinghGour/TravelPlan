# ⚠️ SECURITY WARNING

The current implementation uses `dangerouslyAllowBrowser: true` in the Groq client, which exposes your API key in the browser. This is **ONLY acceptable for development/demo purposes**.

## For Production:
1. Create a backend API endpoint (Node.js/Express, Python/Flask, etc.)
2. Move the Groq client to the backend
3. Make HTTP requests from the frontend to your backend
4. Store the API key securely on the server

## Example Backend Implementation:
```javascript
// server.js (Node.js + Express)
app.post('/api/analyze-itinerary', async (req, res) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  // ... AI analysis logic here
});
```

## Frontend changes:
```typescript
// Replace direct Groq calls with HTTP requests
const response = await fetch('/api/analyze-itinerary', {
  method: 'POST',
  body: JSON.stringify(activitiesJSON)
});
```
