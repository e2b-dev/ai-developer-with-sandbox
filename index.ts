import 'dotenv/config'

import OpenAI from 'openai'
import path from 'path'
import prompts from 'prompts'
import { Sandbox } from '@e2b/sdk'
import { customAlphabet } from 'nanoid'
import ora from 'ora';
import { MessageContentText } from 'openai/resources/beta/threads'

import { ActionSandbox } from './e2b'
import {
	onLog,
	sandboxLog,
	assistantLog
} from './log'

const openai = new OpenAI()
const spinner = ora('Waiting for assistant')

const GIT_USERNAME = process.env.GIT_USERNAME!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!
const AI_ASSISTANT_ID = process.env.AI_ASSISTANT_ID!

const gitEmail = 'e2b-assistant[bot]@users.noreply.github.com'
const gitName = 'e2b-assistant[bot]'

const rootdir = '/home/user'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

const branchID = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6)()

function sleep(time: number) {
	return new Promise((resolve) => setTimeout(resolve, time))
}

async function loginWithGH(sandbox: Sandbox): Promise<string> {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start({ cmd: `gh auth login --with-token < /home/user/.github-token &&
git config --global user.email '${gitEmail}' &&
git config --global user.name '${gitName}' &&
git config --global push.autoSetupRemote true`})
	await process.wait()

	if (process.output.stderr) {
		return `fail: ${process.output.stderr}`
	}

	return 'success'
}

async function cloneRepo(sandbox: Sandbox, repo: string) {
	sandboxLog(`Cloning repo ${repo}`)

	const process = await sandbox.process.start({ cmd: `gh repo clone ${repo} ${repoDirPath}` })
	await process.wait()

	const processCreateBranch = await sandbox.process.start({ cmd: `git checkout -b ai-developer-${branchID}`, cwd: repoDirPath })
	await processCreateBranch.wait()

	const setRemote = await sandbox.process.start({ cmd: `git remote set-url origin https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com/${repo}.git`, cwd: repoDirPath })
	await setRemote.wait()

	return 'success'
}

async function makeCommit(sandbox: Sandbox, { message }: { message: string }): Promise<string> {
	sandboxLog(`Making commit with message ${message}`)
	try {
		const processAdd = await sandbox.process.start({cmd: 'git add .', cwd: repoDirPath })
		await processAdd.wait()

		const processCommit = await sandbox.process.start({
			cmd: `git commit -m '${message}'`,
			cwd: repoDirPath,
		})
		await processCommit.wait()
		return 'success'
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function makePullRequest(sandbox: Sandbox, { title }: { title: string }): Promise<string> {
	sandboxLog(`Making pull request with title ${title}`)
	try {
		const processPush = await sandbox.process.start({ cmd: `git push -u origin ai-developer-${branchID}`, cwd: repoDirPath })
		await processPush.wait()

		const processPR = await sandbox.process.start({
			cmd: `gh pr create --title '${title}' --fill`,
			cwd: repoDirPath,
		})
		await processPR.wait()
		return 'success'
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function saveCodeToFile(sandbox: Sandbox, { code, absolutePath }: { code: string, absolutePath: string }): Promise<string> {
	sandboxLog(`Saving code to file ${absolutePath}`)
	try {
		const dir = path.dirname(absolutePath)

		await sandbox.filesystem.makeDir(dir)
		await sandbox.filesystem.write(absolutePath, code)

		return 'success'
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function makeDir(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
	sandboxLog(`Creating dir ${path}`)
	try {
		await sandbox.filesystem.makeDir(path)

		return 'success'
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function listFiles(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
	sandboxLog(`Listing files in ${path}`)
	try {
		const files = await sandbox.filesystem.list(path)
		const response = files.map(file => file.isDir ? `dir: ${file.name}` : file.name).join('\n')
		return response
	} catch (e) {
		return `Error: ${e.message}}`
	}
}

async function readFile(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
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
