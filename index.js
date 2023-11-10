import 'dotenv/config'
import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'
import path from 'path'

const openai = new OpenAI()
const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const rootdir = '/code'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

async function loginWithGH() {
	await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
	const process = await sandbox.process.start('gh auth login --with-token < /home/user/.github-token')
	await process.wait()

	if (process.output.stderr) {
		throw new Error(process.output.stderr)
	}
}

async function cloneRepo(sandbox, repoURL) {
	const process = await sandbox.process.start(`git clone ${repoURL} ${repoDirPath}`)
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

async function main() {
	const assistant = await getAssistant()
	const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })
	// Docs https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages


	// TODO: Start infinite terminal loop where user communicates with assistant
	//    - when user starts a new session, create a thread like mentioned here - https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages
	//    - Read about runs https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	//
	// TODO: Implement tools
	//   - When a tool returns an output send submit it back to the threads.runs like mentioned here
	//   - https://platform.openai.com/docs/assistants/tools/submitting-functions-outputs

	
  console.log(assistant)
	await sandbox.close()
}

await main()
