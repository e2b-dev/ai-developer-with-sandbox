import 'dotenv/config'

import OpenAI from 'openai'
import prompts from 'prompts'
import ora from 'ora';
import { MessageContentText } from 'openai/resources/beta/threads'

import { ActionSandbox } from './e2b'
import { onLog } from './log'
import { cloneRepo, loginWithGH } from './gh';
import { listFiles, makeCommit, makeDir, makePullRequest, readFile, saveCodeToFile } from './actions';

const openai = new OpenAI()

const AI_ASSISTANT_ID = process.env.AI_ASSISTANT_ID!

function sleep(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

function getAssistant() {
	return openai.beta.assistants.retrieve(AI_ASSISTANT_ID)
}

function createThread(repoURL: string, task: string) {
	return openai.beta.threads.create({
		messages: [
			{
				'role': 'user',
				'content': `Pull this repo: '${repoURL}'. Then carefully plan this task and start working on it: ${task}`,
			}
		]
	})
}

async function initChat(): Promise<{ repoName: string, task: string }> {
	const { repoName } = await prompts({
		type: 'text',
		name: 'repoName',
		message: 'Enter repo name (eg: username/repo):'
	} as any) as any
	
	
	const { task } = await prompts({
		type: 'text',
		name: 'task',
		message: 'Enter the task you want the AI developer to work on:'
	} as any) as any
	
	return { repoName, task }
}

const { repoName, task } = await initChat()

const sandbox = await ActionSandbox.create({ id: 'ai-developer-sandbox', onStdout: onLog, onStderr: onLog })

sandbox.openai.assistant
.registerAction('readFile', readFile)
.registerAction('makeCommit', makeCommit)
.registerAction('makePullRequest', makePullRequest)
.registerAction('saveCodeToFile', saveCodeToFile)
.registerAction('makeDir', makeDir)
.registerAction('listFiles', listFiles)


await loginWithGH(sandbox)
await cloneRepo(sandbox, repoName)

const spinner = ora('Waiting for assistant')
const thread = await createThread(repoName, task)
const assistant = await getAssistant()

let run = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistant.id })
let counter = 0


while (true) {
	counter++
	spinner.start()
	await sleep(1000)
	run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
	if (run.status === 'completed') {
		spinner.stop()
		const messages = await openai.beta.threads.messages.list(thread.id)
		const textMessages = messages.data[0].content.filter(message => message.type === 'text') as MessageContentText[]
		const { userResponse } = await prompts({ type: 'text', name: 'userResponse', message: `${textMessages[0].text.value}\nIf you want to exit write 'exit', otherwise write your response:\n` })
		if (userResponse === 'exit') {
			break
		}
		spinner.start()

		await openai.beta.threads.messages.create(thread.id, {
			role: 'user',
			content: userResponse as string,
		})

		run = await openai.beta.threads.runs.create(thread.id, {
			assistant_id: assistant.id,
		})
	}
	else if (run.status === 'requires_action') {
		spinner.stop()

		const outputs = await sandbox.openai.assistant.run(run)

		spinner.start()

		if (outputs.length > 0) {
			await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
				tool_outputs: outputs,
			})

		}
	} else if (run.status === 'queued' || run.status === 'in_progress') {
		continue
	} else {
		throw new Error(`Unknown status: ${run.status}`)
	}
}

await sandbox.close()
