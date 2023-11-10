import 'dotenv/config'

import OpenAI from 'openai'
import path from 'path'
import prompts from 'prompts'
import { Sandbox } from '@e2b/sdk'

const openai = new OpenAI()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const AI_ASSISTANT_ID = process.env.AI_ASSISTANT_ID!

const rootdir = '/code'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

function sleep(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

function log(output: { line: string }) {
	console.log(output.line)
}

async function loginWithGH(sandbox: Sandbox) {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start({ cmd: 'gh auth login --with-token < /home/user/.github-token' })
	await process.wait()

	if (process.output.stderr) {
		throw new Error(process.output.stderr)
	}
}

async function cloneRepo(sandbox: Sandbox, repoURL: string) {
	const process = await sandbox.process.start({ cmd: `git clone ${repoURL} ${repoDirPath}`, onStderr: log })
	await process.wait()

	const processCreateBranch = await sandbox.process.start({ cmd: 'git checkout -b ai-developer', cwd: repoDirPath, onStderr: log })
	await processCreateBranch.wait()
}

async function makeCommit(sandbox: Sandbox, message: string) {
	const processAdd = await sandbox.process.start({ cmd: 'git add .', cwd: repoDirPath, onStderr: log })
	await processAdd.wait()

	const processCommit = await sandbox.process.start({ cmd: `git commit -m "${message}"`, cwd: repoDirPath, onStderr: log })
	await processCommit.wait()
}

async function makePullRequest(sandbox: Sandbox, title: string) {
	const processPush = await sandbox.process.start({ cmd: 'git push', cwd: repoDirPath, onStderr: log })
	await processPush.wait()

	const processPR = await sandbox.process.start({ cmd: `gh pr create --title "${title}"`, cwd: repoDirPath, onStderr: log })
	await processPR.wait()
}

function getPathToRepo(relativePath: string) {
	return path.join(repoDirPath, relativePath)
}

async function saveCodeToFile(sandbox: Sandbox, code: string, relativePath: string) {
	await sandbox.filesystem.write(getPathToRepo(relativePath), code)
}

async function listFiles(sandbox: Sandbox, relativePath: string) {
	return await sandbox.filesystem.read(getPathToRepo(relativePath))
}

async function readFile(sandbox: Sandbox, relativePath: string) {
	return await sandbox.filesystem.read(getPathToRepo(relativePath))
}

function getAssistant() {
	return openai.beta.assistants.retrieve(AI_ASSISTANT_ID)
}

function createThread(repoURL: string, task: string) {
	return openai.beta.threads.create({
		messages: [
			{
				"role": "user",
				"content": `Pull this repo: '${repoURL}'. Then carefully plan this task and start working on it: ${task}`,
			}
		]
	});
}

async function initChat(): Promise<{ repoURL: string, task: string }> {
	const { repoURL, task } = await prompts({
		type: 'text',
		name: 'repoURL',
		message: 'Enter repo URL with which you want the AI developer to work on:'
	},
	{
		type: 'text',
		name: 'task',
		message: 'Enter the task you want the AI developer to work on:'
	} as any) as any

	return { repoURL, task }
}

async function processAssistantMessage(sandbox: Sandbox, requiredAction) {
	const toolCals = requiredAction.submit_tool_outputs.tool_calls
	const outputs = []
	for (const toolCall of toolCals) {
		let output = null
		const toolName = toolCall.function.name
		if (toolName === 'makeCommit') {
			await makeCommit(sandbox,  toolCall.function.arguments[0])
		} else if (toolName === 'makePullRequest') {
			await makePullRequest(sandbox,  toolCall.function.arguments[0])
		} else if (toolName === 'saveCodeToFile') {
			await saveCodeToFile(sandbox,  toolCall.function.arguments[0],  toolCall.function.arguments[1])
		} else if (toolName === 'listFiles') {
			output = await listFiles(sandbox,  toolCall.function.arguments[0])
		} else if (toolName === 'readFile') {
			output = await readFile(sandbox,  toolCall.function.arguments[0])
		} else {
			throw new Error(`Unknown tool: ${toolName}`)
		}
		if (output) {
			outputs.push({
				toolCallId: toolCall.id,
				output: output
			})
		}
	}
	return outputs
}

const assistant = await getAssistant()
const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox', onStdout: log, onStderr: log })
// await loginWithGH(sandbox)

// Start terminal session with user
// const { repoURL, task } = await initChat()
const repoURL = "	"
const task = "Write a function that takes a string and returns the string reversed."
// await cloneRepo(sandbox, repoURL)
const thread = await createThread(repoURL, task)

let run = await openai.beta.threads.runs.create(
	thread.id,
	{
		assistant_id: assistant.id,
	}
)
console.log(run)
	let counter = 0
while(true) {
	counter++
	console.log(counter)
	await sleep(1000)
	run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
	console.log(run.status)
	if (run.status === 'completed') {
		break
	}
	else if (run.status === 'requires_action') {
		console.log(run.required_action)
		const outputs = await processAssistantMessage(sandbox, run.required_action)
		await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, outputs)
	} else if (run.status === 'queued' || run.status === 'in_progress') {
		continue
	} else {
		throw new Error(`Unknown status: ${run.status}`)
	}

}
const steps = await openai.beta.threads.runs.steps.list(thread.id, run.id)
const messages= await openai.beta.threads.messages.list(
	thread.id,

);
console.log('steps', steps.data[0].step_details.message_creation)
console.log('message', messages.data[0].content)
console.log('messages', messages.data.map((message) => message.content))
// await openai.beta.threads.runs.update()

// const runSteps = await openai.beta.threads.runs.steps.list(thread.id, run.id)
// console.log(runSteps)

await sandbox.close()
