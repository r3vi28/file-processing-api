import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp({ corsOrigins: env.CORS_ORIGINS });

app.listen(env.PORT, (error) => {
  if (error) {
    throw error;
  }

  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
});
