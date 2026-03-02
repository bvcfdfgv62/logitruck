import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = 3000;

// Security and utility middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

app.use('/api/', apiLimiter);

// Validation schema for the route calculation
const routeSchema = z.object({
  origin: z.string().min(1, "Origem é obrigatória"),
  destination: z.string().min(1, "Destino é obrigatório"),
});

// API Routes
app.post('/api/calculate-route', async (req, res) => {
  try {
    const { origin, destination } = routeSchema.parse(req.body);
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    // Call Google Maps Distance Matrix API
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        key: apiKey,
        language: 'pt-BR',
      }
    });

    const data = response.data;

    if (data.status !== 'OK') {
      return res.status(400).json({ error: `Google Maps API error: ${data.status}` });
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      return res.status(400).json({ error: `Route not found: ${element.status}` });
    }

    const distanceMeters = element.distance.value;
    const distanceKm = distanceMeters / 1000;
    
    const durationSeconds = element.duration.value;
    const durationHours = durationSeconds / 3600;

    res.json({
      distanceKm,
      durationHours,
      originAddress: data.origin_addresses[0],
      destinationAddress: data.destination_addresses[0],
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as z.ZodError<any>).errors[0].message });
    }
    console.error('Error calculating route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
