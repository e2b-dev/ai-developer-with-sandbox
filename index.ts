import 'dotenv/config'

import OpenAI from 'openai'
import prompts from 'prompts'
import ora from 'ora'
import { MessageContentText } from 'openai/resources/beta/threads'
import { Sandbox } from '@e2b/sdk'

import { onLog } from './log'
import { cloneRepo, loginWithGH } from './gh'
import { sleep } from './sleep'
import { listFiles, makeCommit, makeDir, makePullRequest, readFile, saveCodeToFile, runCode } from './actions'

import { listAIDeveloper } from './aiAssistant-list'

const openai = new OpenAI()


  // Function to prompt the user to select an AI assistant and return the selected assistant's ID
  async function selectAIAssistant(): Promise<string> {
    // Fetch the list of AI assistants
    const aiAssistants = await listAIDeveloper();

    // Create a list of choices for the prompt
    const aiChoices = aiAssistants.map((assistant, index) => ({
      title: assistant.name,
      value: index,
    }));

    let { selectedAI } = (await prompts({
      type: 'select',
      name: 'selectedAI',
      message: 'Choose an AI assistant:',
      choices: aiChoices,
    })) as any;

    // Return the ID of the selected AI assistant
    return aiAssistants[selectedAI].id;
  }

  // Set the selected AI assistant
  const AI_ASSISTANT_ID = await selectAIAssistant();

async function initChat(): Promise<{ repoName: string; task: string }> {
    let { repoName } = (await prompts({
      type: 'text',
      name: 'repoName',
      message: 'Enter repo name (eg: username/repo):',
    } as any)) as any
  
    // Replace any backslashes in the repo name with forward slashes
    repoName = repoName.replace(/\\/g, '/');
  
    let { task } = (await prompts({
      type: 'text',
      name: 'task',
      message: 'Enter the task you want the AI developer to work on:',
    } as any)) as any

  return { repoName, task }
}

const { repoName, task } = await initChat()

const sandbox = await Sandbox.create({
  id: 'ai-developer-sandbox',
  onStdout: onLog,
  onStderr: onLog,
})

sandbox
  .addAction(readFile)
  .addAction(makeCommit)
  .addAction(makePullRequest)
  .addAction(saveCodeToFile)
  .addAction(makeDir)
  .addAction(listFiles)
  .addAction(runCode)

  await loginWithGH(sandbox)
  await cloneRepo(sandbox, repoName)

const spinner = ora('Waiting for assistant')
spinner.start()

const thread = await openai.beta.threads.create({
  messages: [
    {
      role: 'user',
      content: `Pull this repo: '${repoName}'. Then carefully plan this task and start working on it: ${task}`,
    },
  ],
})
const assistant = await openai.beta.assistants.retrieve(AI_ASSISTANT_ID)

let run = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistant.id,
})

assistantLoop: while (true) {
  await sleep(1000)

  switch (run.status) {
    case 'requires_action': {
      spinner.stop()
      const outputs = await sandbox.openai.actions.run(run)
      spinner.start()

      if (outputs.length > 0) {
        await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
          tool_outputs: outputs,
        })
      }

      break
    }
    case 'completed': {
      spinner.stop()
      const messages = await openai.beta.threads.messages.list(thread.id)
      const textMessages = messages.data[0].content.filter(message => message.type === 'text') as MessageContentText[]
      const { userResponse }: { userResponse: string } = await prompts({
        type: 'text',
        name: 'userResponse',
        message: `${textMessages[0].text.value}\nIf you want to exit write 'exit', otherwise write your response:\n`,
      })
      if (userResponse === 'exit') {
        break assistantLoop
      }
      spinner.start()

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: userResponse as string,
      })

      run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      })

      break
    }
    case 'queued':
    case 'in_progress':
      break
    case 'cancelled':
    case 'cancelling':
    case 'expired':
    case 'failed':
      break assistantLoop
    default:
      console.error(`Unknown status: ${run.status}`)
      break assistantLoop
  }

  run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
}

spinner.stop()
await sandbox.close()