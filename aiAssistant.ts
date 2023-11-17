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
    You also have the ability to actually run the Python code or Shell commands, you should try this if you do not find other appropriate tool.
    Don't argue with me and just complete the task.`,
    name: 'AI Developer',
    tools: [...functions],
    model: 'gpt-4-1106-preview',
    //model: 'gpt-3.5-turbo-1106',
  })
  console.log("Assistant ready, AI Developer Assistant ID that should be added to you .env file:", aiDeveloper.id)
}

createAIDeveloper()
