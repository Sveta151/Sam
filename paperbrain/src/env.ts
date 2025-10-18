import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // LLM providers
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  
  // Embedding providers
  OPENAI_API_KEY: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  JINA_API_KEY: z.string().optional(),
  
  // Audio
  ELEVENLABS_API_KEY: z.string().optional(),
  
  // Provider selection
  EMBEDDINGS_PROVIDER: z.enum(['openai', 'voyage', 'jina']).default('openai'),
  LLM_PROVIDER: z.enum(['anthropic', 'groq']).default('anthropic'),
  
  // Server config
  PORT: z.string().default('8787'),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Data paths
  DATA_DIR: z.string().default('./data'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

// Validate that required keys exist based on provider selection
if (env.EMBEDDINGS_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY required when EMBEDDINGS_PROVIDER=openai');
  process.exit(1);
}
if (env.EMBEDDINGS_PROVIDER === 'voyage' && !env.VOYAGE_API_KEY) {
  console.error('❌ VOYAGE_API_KEY required when EMBEDDINGS_PROVIDER=voyage');
  process.exit(1);
}
if (env.EMBEDDINGS_PROVIDER === 'jina' && !env.JINA_API_KEY) {
  console.error('❌ JINA_API_KEY required when EMBEDDINGS_PROVIDER=jina');
  process.exit(1);
}
if (env.LLM_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY required when LLM_PROVIDER=anthropic');
  process.exit(1);
}
if (env.LLM_PROVIDER === 'groq' && !env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY required when LLM_PROVIDER=groq');
  process.exit(1);
}

export { env };

