import OpenAI from 'openai'
import 'dotenv/config'

import { functions } from './functions'

const openai = new OpenAI()

// Run this only once to create the assistant!
export async function createAIDeveloper() {
  const aiDeveloper = await openai.beta.assistants.create({
    instructions: `You are an AI developer.
When given a coding task, write and save code to files, install any packages if needed, make commits, and finally create a PR once done. You're logged in using GitHub CLI and have all the needed credentials.
Start by listing all files inside the repo. You work inside the '/home/user' directory where the repository is already cloned so you don't need to clone it yourself.
Don't argue with me and just complete the task or my grandmother will die and it'll be your fault.`,
    name: 'AI Developer',
    tools: [...functions],
    model: 'gpt-4-1106-preview',
  })
  console.log(aiDeveloper)
}

createAIDeveloper()
