import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'
import 'dotenv/config'
import promptSync from 'prompt-sync'
const prompt = promptSync({ sigint: true })

const openai = new OpenAI()

async function cloneRepo(sandbox, repoURL) {
	const process = await sandbox.process.start(`git clone ${repoURL}`)
	await process.wait()
	const processCreateBranch = await sandbox.process.start('git checkout -b ai-developer')
	await processCreateBranch.wait()
}

async function makeCommit(sandbox, message) {
	const processAdd =await sandbox.process.start('git add .')
	await processAdd.wait()
	const processCommit = await sandbox.process.start(`git commit -m "${message}"`)
	await processCommit.wait()
}

async function makePullRequest(sandbox, title) {
	const processPush = await sandbox.process.start('git push')
	await processPush.wait()
	const processPR = await sandbox.process.start(`gh pr create --title "${title}"`)
	await processPR.wait()
}

async function saveCodeToFile(sandbox, code, filename) {
	return await sandbox.filesystem.write(filename, code)
}

async function listFiles(sandbox, path) {
	return await sandbox.filesystem.read(path)
}

async function readFile(sandbox, path) {
	return await sandbox.filesystem.read(path)
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

function initChat() {
	const repoURL = prompt('Enter repo URL with which you want the AI developer to work: ')
	const task = prompt('Enter the task you want the AI developer to work on: ')
	return { repoURL, task }
}

async function processAssistantMessage(sandbox, requiredAction) {
	const toolCals = requiredAction.sumbitToolOutpus.toolCalls
	const outputs = []
	for (const toolCall of toolCals) {
		let output = null
		const toolName = toolCall.function.name
		if (toolName === 'cloneRepo') {
			await cloneRepo(sandbox, toolCall.input.repoURL)
		} else if (toolName === 'makeCommit') {
			await makeCommit(sandbox, toolCall.input.message)
		} else if (toolName === 'makePullRequest') {
			await makePullRequest(sandbox, toolCall.input.title)
		} else if (toolName === 'saveCodeToFile') {
			await saveCodeToFile(sandbox, toolCall.input.code, toolCall.input.filename)
		} else if (toolName === 'listFiles') {
			output = await listFiles(sandbox, toolCall.input.path)
		} else if (toolName === 'readFile') {
			output = await readFile(sandbox, toolCall.input.path)
		} else {
			throw new Error(`Unknown tool: ${toolName}`)
		}
		if (output) {
			outputs.push({
				toolCallId: toolCall.toolCallId,
				output: output
			})
		}
	}
	return outputs
}

async function main() {
	const assistant = await getAssistant()
	const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })

	const { repoURL, task } = initChat()
	const thread = await createThread(repoURL, task)

	const run = await openai.beta.threads.runs.create(
		thread.id,
		{
			assistant_id: assistant.id,
		}
	)
	console.log(run)

	await sandbox.close()
}


await main()
