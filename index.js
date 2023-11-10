import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'
import path from 'path'
import 'dotenv/config'
import prompts from 'prompts'

const openai = new OpenAI()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const rootdir = '/code'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

async function loginWithGH(sandbox) {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start({ cmd: 'gh auth login --with-token < /home/user/.github-token' })
	await process.wait()

	if (process.output.stderr) {
		throw new Error(process.output.stderr)
	}
}

async function cloneRepo(sandbox, repoURL) {
	const process = await sandbox.process.start({ cmd: `git clone ${repoURL} ${repoDirPath}` })
	await process.wait()

	if (process.output.stderr) {
		throw new Error(process.output.stderr)
	}

	const processCreateBranch = await sandbox.process.start({ cmd: 'git checkout -b ai-developer', cwd: repoDirPath })
	await processCreateBranch.wait()

	if (processCreateBranch.output.stderr) {
		throw new Error(processCreateBranch.output.stderr)
	}
}

async function makeCommit(sandbox, message) {
	const processAdd = await sandbox.process.start({ cmd: 'git add .', cwd: repoDirPath })
	await processAdd.wait()

	if (processAdd.output.stderr) {
		throw new Error(processAdd.output.stderr)
	}

	const processCommit = await sandbox.process.start({ cmd: `git commit -m "${message}"`, cwd: repoDirPath })
	await processCommit.wait()

	if (processCommit.output.stderr) {
		throw new Error(processCommit.output.stderr)
	}
}

async function makePullRequest(sandbox, title) {
	const processPush = await sandbox.process.start({ cmd: 'git push', cwd: repoDirPath })
	await processPush.wait()

	if (processPush.output.stderr) {
		throw new Error(processPush.output.stderr)
	}

	const processPR = await sandbox.process.start({ cmd: `gh pr create --title "${title}"`, cwd: repoDirPath })
	await processPR.wait()

	if (processPR.output.stderr) {
		throw new Error(processPR.output.stderr)
	}
}

function getPathToRepo(relativePath) {
	return path.join(repoDirPath, relativePath)
}

async function saveCodeToFile(sandbox, code, relativePath) {
	await sandbox.filesystem.write(getPathToRepo(relativePath), code)
}

async function listFiles(sandbox, relativePath) {
	return await sandbox.filesystem.read(getPathToRepo(relativePath))
}

async function readFile(sandbox, relativePath) {
	return await sandbox.filesystem.read(getPathToRepo(relativePath))
}

function getAssistant() {
	return openai.beta.assistants.retrieve(process.env.AI_ASSISTANT_ID)
}

function createThread(repoURL, task) {
	return openai.beta.threads.create({
		messages: [
			{
				"role": "user",
				"content": `Pull this repo: '${repoURL}'. Then carefully plan this task and start working on it: ${task}`,
			}
		]
	});
}

async function initChat() {
	const questions = [
		{
			type: 'text',
			name: 'repoURL',
			message: 'Enter repo URL with which you want the AI developer to work on:'
		},
		{
			type: 'text',
			name: 'task',
			message: 'Enter the task you want the AI developer to work on:'
		},
	]

	const { repoURL, task } = await prompts(questions)
	return { repoURL, task }
}

async function processAssistantMessage(sandbox, requiredAction) {
	console.log(requiredAction)
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

async function main() {
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

	while(true) {
		await sleep(1000)
		run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
		console.log(run)
		if (run.status === 'completed') {
			break
		}
		if (run.status === 'action_required') {
			const outputs = await processAssistantMessage(sandbox, run.required_action)
			await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, outputs)
		}
	}

	const steps = await openai.beta.threads.runs.steps.list(thread.id, run.id)
	const message = await openai.beta.threads.messages.retrieve(
		thread.id,
		steps.data[0].message_id
  );
	console.log(steps.data)
	console.log(message)
	// await openai.beta.threads.runs.update()

	// const runSteps = await openai.beta.threads.runs.steps.list(thread.id, run.id)
	// console.log(runSteps)

	await sandbox.close()
}


await main()
