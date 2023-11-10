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


  console.log(assistant)
	// await sandbox.close()
}

await main()

