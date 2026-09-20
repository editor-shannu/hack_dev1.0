import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Ensure DNS resolvers can resolve MongoDB SRV records across all network environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if restricted
}

/**
 * Ensures environment variables from secrets.env are loaded into process.env.
 * Does not overwrite existing environment variables.
 */
export function ensureSecretsLoaded(): void {
  const envFiles = ['secrets.env', '.env.local', '.env'];
  for (const file of envFiles) {
    try {
      const filePath = path.resolve(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '').trim();
            if (val) {
              const isPlaceholder = val.includes('your_') || val.includes('placeholder');
              const currentVal = process.env[key];
              const isCurrentEmptyOrPlaceholder = !currentVal || currentVal.trim() === '' || currentVal.includes('your_');
              if (!isPlaceholder && (file === 'secrets.env' || isCurrentEmptyOrPlaceholder)) {
                process.env[key] = val;
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn(`Could not read ${file}:`, err);
    }
  }
}

// Auto-run on module import
ensureSecretsLoaded();
