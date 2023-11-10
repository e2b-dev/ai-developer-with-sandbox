import 'dotenv/config'
import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'

const openai = new OpenAI()
const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const rootdir = '/code'
const repoDir = 'repo'
const repoDirPath = path.join(rootdir, repoDir)

const gitEmail = 'e2b-assistant[bot]@users.noreply.github.com'
const gitName = 'e2b-assisntant[bot]'

// function getAuthRepoURL(repoURL) {
// 	return repoURL.replace('https://', `https://${GITHUB_TOKEN}@`)
// }

// async function cloneRepo(repoURL) {
// 	const repoURLAuth = getAuthRepoURL(repoURL)

// 	const { output: { stderr } } = await sandbox.process.start({
// 		cmd: `git clone --depth 1 ${repoURLAuth} ${repoDir}`,
// 		cwd: rootdir,
// 		onStdout: console.log,
// 	})

// 	if (stderr) {
// 		throw new Error(stderr)
// 	}
// }

// async function makeCommit(repoURL, message) {
// 	const repoURLAuth = getAuthRepoURL(repoURL)
	
// 	const { output: { stderr } } = await sandbox.process.start({
// 		cmd: `
// git config --global user.email "${gitEmail}" &&
// git config --global user.name "${gitName}" &&
// git config --global push.autoSetupRemote true &&
// git add . &&
// git commit -m "${message}" &&
// git push ${repoURLAuth}
// `,
// 		cwd: repoDirPath,
// 		onStdout: console.log,
// 	})

// 	if (stderr) {
// 		throw new Error(stderr)
// 	}
// }

// async function createBranch(branchName) {
// 	const { output: { stderr } } = await sandbox.process.start({
// 		cmd: `git checkout -b ${branchName}`,
// 		cwd: repoDirPath,
// 		onStdout: console.log,
// 	})

// 	if (stderr) {
// 		throw new Error(stderr)
// 	}
// }

// function makePullRequest(title) {
// 	const branchName = `pr-${title.replace(/\s/g, '-')}`
// }

	// Create a new branch

	// Push the branch

	// Create a pull request

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
