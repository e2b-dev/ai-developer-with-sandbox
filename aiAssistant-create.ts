import OpenAI from 'openai'
import 'dotenv/config'

import { functions } from './functions'
import { assistant_config } from './functions';

const openai = new OpenAI()

// Run this only once to create the assistant!
// npm run create-ai-assistant
export async function createAIDeveloper() {
  const aiDeveloper = await openai.beta.assistants.create({
    instructions: assistant_config.instructions,
    tools: [...functions],
    model: assistant_config.model,
    name: assistant_config.name,
  })
  console.log("Assistant ready, AI Developer Assistant ID that should be added to you .env file:", aiDeveloper.id)
}

createAIDeveloper()
