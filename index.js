import 'dotenv/config'
import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'


const openai = new OpenAI()
// const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })

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
	//
	// TODO: Create custom E2B sandbox "ai-developer-sandbox" and make it public

  console.log(assistant)
	await sandbox.close()
}

await main()
