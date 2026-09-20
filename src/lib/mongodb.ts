import '@/lib/env';
import mongoose from 'mongoose';
import dns from 'dns';

/**
 * Global cache to maintain a single cached connection across hot reloads
 * in development and prevent connections from growing exponentially in Next.js.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Resolves mongodb+srv:// connection strings into direct mongodb:// replica set URIs
 * using public DNS servers (8.8.8.8, 1.1.1.1) to prevent querySrv ECONNREFUSED errors
 * common in Windows, corporate networks, and restricted local DNS environments.
 */
async function resolveMongoUrl(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const match = uri.match(/^mongodb\+srv:\/\/([^:]+:[^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!match) {
    return uri;
  }

  const [, auth, host, path = '/', query = ''] = match;

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
    if (!srvRecords || srvRecords.length === 0) {
      return uri;
    }

    const txtRecords = await resolver.resolveTxt(host).catch(() => []);
    const hosts = srvRecords.map((s) => `${s.name}:${s.port}`).join(',');
    const txtOpts = txtRecords.flat().join('&');
    const baseQuery = query ? query.slice(1) : '';
    const allOpts = ['ssl=true', txtOpts, baseQuery].filter(Boolean).join('&');

    return `mongodb://${auth}@${hosts}${path}${allOpts ? `?${allOpts}` : ''}`;
  } catch (err) {
    console.warn('DNS SRV auto-resolution fallback error:', (err as Error).message);
    return uri;
  }
}

function sanitizeMongoUrl(url: string): string {
  let cleaned = url.trim();
  if (cleaned.endsWith('?appName') || cleaned.endsWith('&appName')) {
    cleaned = cleaned.replace(/[?&]appName$/, '?appName=Prescriptime');
  } else if (cleaned.includes('appName=&') || cleaned.endsWith('appName=')) {
    cleaned = cleaned.replace(/appName=(?:&|$)/, 'appName=Prescriptime');
  } else if (/[?&]appName(?=[^=a-zA-Z0-9]|$)/.test(cleaned)) {
    cleaned = cleaned.replace(/([?&])appName(?=[^=a-zA-Z0-9]|$)/, '$1appName=Prescriptime');
  }
  return cleaned;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const rawUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || process.env.MONGO_URL;

  if (!rawUrl) {
    throw new Error('MongoDB connection URL is missing. Please define MONGODB_URL in secrets.env');
  }

  const cleanUrl = sanitizeMongoUrl(rawUrl);

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    cached!.promise = (async () => {
      const finalUrl = await resolveMongoUrl(cleanUrl);
      const opts = {
        bufferCommands: false,
        dbName: 'prescriptime',
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
      };

      const m = await mongoose.connect(finalUrl, opts);
      console.log('Connected to MongoDB database: prescriptime');
      return m;
    })();
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
