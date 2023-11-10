import 'dotenv/config'

import OpenAI from 'openai'
import path from 'path'
import prompts from 'prompts'
import { Sandbox } from '@e2b/sdk'
import { nanoid } from 'nanoid'
import { RunSubmitToolOutputsParams } from "openai/resources/beta/threads/runs/runs"
import chalk from 'chalk'

const openai = new OpenAI()

const orange = chalk.hex('#FFB766')

const GIT_USERNAME = process.env.GIT_USERNAME!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const AI_ASSISTANT_ID = process.env.AI_ASSISTANT_ID!

const gitEmail = 'e2b-assistant[bot]@users.noreply.github.com'
const gitName = 'e2b-assistant[bot]'

const rootdir = '/home/user'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

const branchID = nanoid()

function sleep(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

function onLog(output: { line: string }) {
	sandboxLog(output.line)
}

function sandboxLog(line: string) {
	console.log(`${orange('[Sandbox]')} ${line}`)
}

async function loginWithGH(sandbox: Sandbox): Promise<string> {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start({ cmd: `gh auth login --with-token < /home/user/.github-token &&
git config --global user.email "${gitEmail}" &&
git config --global user.name "${gitName}" &&
git config --global push.autoSetupRemote true`})
	await process.wait()

	if (process.output.stderr) {
		return `fail: ${process.output.stderr}`
	}

	return "success"
}

async function cloneRepo(sandbox: Sandbox, repo: string) {
	const process = await sandbox.process.start({ cmd: `gh repo clone ${repo} ${repoDirPath}` })
	await process.wait()

	const processCreateBranch = await sandbox.process.start({ cmd: `git checkout -b ai-developer-${branchID}`, cwd: repoDirPath })
	await processCreateBranch.wait()

	const setRemote = await sandbox.process.start({ cmd: `git remote set-url origin https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com/${repo}.git`, cwd: repoDirPath })
	await setRemote.wait()

	return "success"
}

async function makeCommit(sandbox: Sandbox, message: string): Promise<string> {
	sandboxLog(`Making commit with message ${message}`)
	try {
		const processAdd = await sandbox.process.start({cmd: 'git add .', cwd: repoDirPath })
		await processAdd.wait()

		const processCommit = await sandbox.process.start({
			cmd: `git commit -m "${message}"`,
			cwd: repoDirPath,
		})
		await processCommit.wait()
		return "success"
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function makePullRequest(sandbox: Sandbox, title: string): Promise<string> {
	sandboxLog(`Making pull request with title ${title}`)
	try {
		const processPush = await sandbox.process.start({ cmd: `git push -u origin ai-developer-${branchID}`, cwd: repoDirPath })
		await processPush.wait()

		const processPR = await sandbox.process.start({
			cmd: `gh pr create --title "${title}" --fill`,
			cwd: repoDirPath,
		})
		await processPR.wait()
		return "success"
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function saveCodeToFile(sandbox: Sandbox, code: string, absolutePath: string): Promise<string> {
	sandboxLog(`Saving code to file ${absolutePath}`)
	try {
		const dir = path.dirname(absolutePath)

		await sandbox.filesystem.makeDir(dir)
		await sandbox.filesystem.write(absolutePath, code)

		return "success"
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function makeDir(sandbox: Sandbox, path: string): Promise<string> {
	sandboxLog(`Creating dir ${path}`)
	try {
		await sandbox.filesystem.makeDir(path)

		return "success"
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function listFiles(sandbox: Sandbox, path: string): Promise<string> {
	sandboxLog(`Listing files in ${path}`)
	try {
		return (await sandbox.filesystem.list(path)).map(file => file.isDir ? `dir: ${file.name}` : file.name).toString()
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function readFile(sandbox: Sandbox, path: string): Promise<string> {
	sandboxLog(`Reading file ${path}`)
	try {
		return await sandbox.filesystem.read(path)
	} catch (e) {
		return `Error: ${e.message}}`
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

async function processAssistantMessage(sandbox: Sandbox, requiredAction: OpenAI.Beta.Threads.Runs.Run.RequiredAction) {
	const toolCalls = requiredAction.submit_tool_outputs.tool_calls
  const outputs: RunSubmitToolOutputsParams.ToolOutput[] = []

	for (const toolCall of toolCalls) {
		let output: any
		const toolName = toolCall.function.name
		const args = JSON.parse(toolCall.function.arguments)

		console.log(`Calling tool "${toolName}" with args ${args}`)

		if (toolName === 'makeCommit') {
			output = await makeCommit(sandbox, args.message)
		} else if (toolName === 'makePullRequest') {
			output = await makePullRequest(sandbox,  args.title)
		} else if (toolName === 'saveCodeToFile') {
			output = await saveCodeToFile(sandbox, args.code, args.filename)
		} else if (toolName === 'listFiles') {
			output = await listFiles(sandbox, args.path)
		} else if (toolName === 'makeDir') {
			output = await makeDir(sandbox, args.path)
		} else if (toolName === 'readFile') {
			output = await readFile(sandbox, args.path)
		} else {
			throw new Error(`Unknown tool: ${toolName}`)
		}

		console.log(`Tool ${toolCall.function.name} output: ${output}`)

		if (output) {
			outputs.push({
				tool_call_id: toolCall.id,
				output,
			})
		}
	}

	return outputs
}

const { repoName, task } = await initChat()

const assistant = await getAssistant()
const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox', onStdout: onLog, onStderr: onLog })
await loginWithGH(sandbox)

// Start terminal session with user

await cloneRepo(sandbox, repoName)
const thread = await createThread(repoName, task)

let run = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistant.id })

let counter = 0
while (true) {
	counter++
	console.log(counter)
	await sleep(1000)
	run = await openai.beta.threads.runs.retrieve(thread.id, run.id)
	console.log(run.status)
	if (run.status === 'completed') {
		const messages = await openai.beta.threads.messages.list(thread.id)
		// messages.data.forEach(m => console.log(m.content))
		console.log(messages.data[0].content)

		const { userResponse } = await prompts({ type: 'text', name: 'userResponse', message: ' ' })
		await openai.beta.threads.messages.create(thread.id, {
			role: 'user',
			content: userResponse as string,
		})
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

const messages= await openai.beta.threads.messages.list(thread.id)
console.log('messages', messages.data.map((message) => message.content))

await sandbox.close()
