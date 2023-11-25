import OpenAI from 'openai'
import 'dotenv/config'

import { functions } from './aiFunctions'
import { assistant_config } from './aiFunctions';

const openai = new OpenAI()

// Run this to update the assistant!
// npm run create-ai-assistant
export async function updateAIDeveloper() {
  
  const aiDeveloper = await openai.beta.assistants.update(
    process.env.AI_ASSISTANT_ID!,
    {
      instructions: assistant_config.instructions,
      tools: [...functions],
      model: assistant_config.model,
      name: assistant_config.name,
    }
  )
  console.log("Assistant updated, AI Developer Assistant ID:", aiDeveloper.id)
}

updateAIDeveloper()

