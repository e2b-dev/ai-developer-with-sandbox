import 'dotenv/config'
import OpenAI from 'openai'
import path from 'path'
import prompts from 'prompts'
import { Sandbox } from '@e2b/sdk'
import { RunSubmitToolOutputsParams } from 'openai/resources/beta/threads/runs/runs'

const openai = new OpenAI()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const AI_ASSISTANT_ID = process.env.AI_ASSISTANT_ID!

const rootdir = '/home/user'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

function sleep(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

function log(output: { line: string }) {
	console.log(output.line)
}

async function loginWithGH(sandbox: Sandbox): Promise<void> {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start({ cmd: 'gh auth login --with-token < /home/user/.github-token' })
	await process.wait()

	if (process.output.stderr) {
		throw new Error(process.output.stderr)
	}
}

async function cloneRepo(sandbox: Sandbox, repoURL: string): Promise<void> {
	const process = await sandbox.process.start({ cmd: `git clone ${repoURL} ${repoDirPath}`, onStderr: log })
	await process.wait()

	const processCreateBranch = await sandbox.process.start({ cmd: 'git checkout -b ai-developer', cwd: repoDirPath, onStderr: log })
	await processCreateBranch.wait()
}

async function makeCommit(sandbox: Sandbox, message: string): Promise<void> {
	const processAdd = await sandbox.process.start({ cmd: 'git add .', cwd: repoDirPath, onStderr: log })
	await processAdd.wait()

	const processCommit = await sandbox.process.start({ cmd: `git commit -m "${message}"`, cwd: repoDirPath, onStderr: log })
	await processCommit.wait()
}

async function makePullRequest(sandbox: Sandbox, title: string, body: string): Promise<void> {
	const processPush = await sandbox.process.start({ cmd: 'git push', cwd: repoDirPath, onStderr: log })
	await processPush.wait()

	const processPR = await sandbox.process.start({ cmd: `gh pr create --title "${title}"`, cwd: repoDirPath, onStderr: log })
	await processPR.wait()
}


async function saveCodeToFile(sandbox: Sandbox, code: string, path: string): Promise<void> {
	await sandbox.filesystem.write(path, code)
}

async function listFiles(sandbox: Sandbox, path: string): Promise<string> {
	return (await sandbox.filesystem.list(path)).toString()
}

async function readFile(sandbox: Sandbox, path: string): Promise<string> {
	try {
		return await sandbox.filesystem.read(path)
	} catch (e) {
		return `File not found: ${path}`
	}
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
	})
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
	const toolCalls = requiredAction.submit_tool_outputs.tool_calls
	console.log(toolCalls)
	const outputs = []
	for (const toolCall of toolCalls) {
		console.log(toolCall.function)
		const args = JSON.parse(toolCall.function.arguments)
		console.log('ARGS:\n',args)
		let output: any
		const toolName = toolCall.function.name
		if (toolName === 'makeCommit') {
			await makeCommit(sandbox,  args.message)
		} else if (toolName === 'makePullRequest') {
			await makePullRequest(sandbox,  args.title, "body")
		} else if (toolName === 'saveCodeToFile') {
			await saveCodeToFile(sandbox,  args.code, args.filename)
		} else if (toolName === 'listFiles') {
			output = await listFiles(sandbox,  args.path)
		} else if (toolName === 'readFile') {
			output = await readFile(sandbox,  args.path)
		} else {
			throw new Error(`Unknown tool: ${toolName}`)
		}

		console.log('OUTPUT:\n',output)

		if (output) {
			outputs.push({
				tool_call_id: toolCall.id,
				output: output
			})
		}
	}

	return outputs
}

const assistant = await getAssistant()
const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox', onStdout: log, onStderr: log })
await loginWithGH(sandbox)

// Start terminal session with user
// const { repoURL, task } = await initChat()
const repoURL = "https://github.com/mlejva/nextjs-todo-app"
const task = "Write a function that takes a string and returns the string reversed."
await cloneRepo(sandbox, repoURL)
const thread = await createThread(repoURL, task)

let run = await openai.beta.threads.runs.create(
	thread.id,
	{
		assistant_id: assistant.id,
	}
)

let counter = 0
while (true) {
	counter++
	console.log(counter)
	await sleep(1000)
	run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
	console.log(run.status)
	if (run.status === 'completed') {
		// TODO: Let user respond to the AI developer
		break
	}
	else if (run.status === 'requires_action') {
		console.log(run.required_action)

		if (!run.required_action) {
			console.log('No required action')
			continue
		}

		const outputs = await processAssistantMessage(sandbox, run.required_action)

		await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
			tool_outputs: outputs,
		})

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
