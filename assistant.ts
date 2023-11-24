import 'dotenv/config'

import OpenAI from 'openai'
import { AssistantCreateParams } from 'openai/resources/beta/assistants/assistants'

import { functions } from './functions'

const openai = new OpenAI()

const config: AssistantCreateParams = {
  name: process.env.ASSISTANT_UNIQUE_NAME!,
  instructions: `You are an AI developer.
  When given a coding task, write and save code to files, install any packages if needed, make commits, and finally create a PR once done. You're logged in using GitHub CLI and have all the needed credentials.
  Start by listing all files inside the repo. You work inside the '/home/user/repo' directory where the repository is already cloned so you don't need to clone it yourself.
  Don't argue with me and just complete the task.`,
  tools: [...functions.map(f => ({
    ...f,
    // Remove the function implementation
    action: undefined,
  }))],
  model: 'gpt-4-1106-preview',
}

const assistants = await openai.beta.assistants.list()
const existingAssistant = assistants.data.find(a => a.name === config.name)

const assistant = existingAssistant
  ? await openai.beta.assistants.update(existingAssistant.id, config)
  : await openai.beta.assistants.create(config)

export { assistant }
