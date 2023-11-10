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

function getAuthRepoURL(repoURL) {
	return repoURL.replace('https://', `https://${GITHUB_TOKEN}@`)
}

async function cloneRepo(repoURL) {
	const repoURLAuth = getAuthRepoURL(repoURL)

	const { output: { stderr } } = await sandbox.process.start({
		cmd: `git clone --depth 1 ${repoURLAuth} ${repoDir}`,
		cwd: rootdir,
		onStdout: console.log,
	})

	if (stderr) {
		throw new Error(stderr)
	}
}

async function makeCommit(repoURL, message) {
	const repoURLAuth = getAuthRepoURL(repoURL)
	
	const { output: { stderr } } = await sandbox.process.start({
		cmd: `
git config --global user.email "${gitEmail}" &&
git config --global user.name "${gitName}" &&
git config --global push.autoSetupRemote true &&
git add . &&
git commit -m "${message}" &&
git push ${repoURLAuth}
`,
		cwd: repoDirPath,
		onStdout: console.log,
	})

	if (stderr) {
		throw new Error(stderr)
	}
}

async function createBranch(branchName) {
	const { output: { stderr } } = await sandbox.process.start({
		cmd: `git checkout -b ${branchName}`,
		cwd: repoDirPath,
		onStdout: console.log,
	})

	if (stderr) {
		throw new Error(stderr)
	}
}

function makePullRequest(title) {
	const branchName = `pr-${title.replace(/\s/g, '-')}`


	// Create a new branch

	// Push the branch

	// Create a pull request
}

function saveCodeToFile(code, filename) {
	console.log('Save code')
}

function listFiles(path) {
	console.log('List files')
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
	//
	// TODO: Create custom E2B sandbox "ai-developer-sandbox" and make it public

  console.log(assistant)
	// await sandbox.close()
}

await main()
