import OpenAI from 'openai'
import 'dotenv/config'

import { functions } from './functions'

const openai = new OpenAI()

// Run this only once to create the assistant!
// npm run create-ai-assistant
export async function createAIDeveloper() {
  const aiDeveloper = await openai.beta.assistants.create({
    instructions: `You are an AI developer.
    When given a coding task, write and save code to files, install any packages if needed, make commits, and finally create a PR once done. You're logged in using GitHub CLI and have all the needed credentials.
    Start by listing all files inside the repo. You work inside the '/home/user/repo' directory where the repository is already cloned so you don't need to clone it yourself.
    Don't argue with me and just complete the task. You also have the ability to actually run the code or commands.`,
    name: 'AI Developer',
    tools: [...functions],
    model: 'gpt-4-1106-preview',
  })
  console.log("Assistant ready, AI Developer ID that should be added to you .env file:", aiDeveloper.id)
}

createAIDeveloper()
