import 'dotenv/config'

import OpenAI from 'openai'
import prompts from 'prompts'
import ora from 'ora'
import { MessageContentText } from 'openai/resources/beta/threads'
import { CloudBrowser } from '@e2b/sdk'

import { onLog } from './utils/log'
import { sleep } from './utils/sleep'
import { functions } from './functions'
import { assistant } from './assistant'

const openai = new OpenAI()

const { task } = await prompts([
  {
    type: 'text',
    name: 'task',
    message: 'Enter the task you want the AI assistant to work on:',
  }
])

const sandbox = await CloudBrowser.create({
  onStdout: onLog,
  onStderr: onLog,
})

for (const f of functions) {
  sandbox.addAction(f.function.name, f.action)
}

const spinner = ora('Waiting for assistant')
spinner.start()

const thread = await openai.beta.threads.create({
  messages: [
    {
      role: 'user',
      content: `Carefully plan task and start working on it: ${task}`,
    },
  ],
})

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
