import 'dotenv/config'
import { Sandbox } from '@e2b/sdk'
import OpenAI from 'openai'


const openai = new OpenAI()
// const sandbox = await Sandbox.create({ id: 'ai-developer-sandbox' })

function cloneRepo(repoURL) {
	console.log('Clone repo')
}

function saveCodeToFile(code, filename) {
	console.log('Save code')
}

function listFiles(path) {
	console.log('List files')
}

function makeCommit(message) {
	console.log('Make commit')
}

function makePullRequest() {
	console.log('Make pull request')
}

function readFile(path) {
	console.log('Read file')
}


function getAssistant() {
	return openai.beta.assistants.retrieve(process.env.AI_ASSISTANT_ID)
}

async function main() {
	const assistant = await getAssistant()
	// Docs https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages


	// TODO: Start infinite terminal loop where user communicates with assistant
	//    - when user starts a new session, create a thread like mentioned here - https://platform.openai.com/docs/assistants/how-it-works/managing-threads-and-messages
	//    - Read about runs https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	//
	// TODO: Implement tools
	//   - When a tool returns an output send submit it back to the threads.runs like mentioned here
	//   - https://platform.openai.com/docs/assistants/tools/submitting-functions-outputs


  console.log(assistant)
	// await sandbox.close()
}

await main()

