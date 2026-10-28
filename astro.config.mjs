import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://keisei-portfolio.vercel.app',
  // Use './' when deploying into a subdirectory if needed
  base: '/',

  integrations: [react()],
});