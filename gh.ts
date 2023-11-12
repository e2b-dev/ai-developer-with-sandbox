import path from 'path'
import { Sandbox } from '@e2b/sdk'
import { customAlphabet } from 'nanoid'

import {
	sandboxLog,
} from './log'


const GIT_USERNAME = process.env.GIT_USERNAME!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!

const gitEmail = 'e2b-assistant[bot]@users.noreply.github.com'
const gitName = 'e2b-assistant[bot]'

export const rootdir = '/home/user'
export const repoDir = 'repo'
export const repoDirPath = path.join(rootdir, repoDir)

export const branchID = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6)()

export async function loginWithGH(sandbox: Sandbox) {
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

export async function cloneRepo(sandbox: Sandbox, repo: string) {
	sandboxLog(`Cloning repo ${repo}`)

	const process = await sandbox.process.start({ cmd: `gh repo clone ${repo} ${repoDirPath}` })
	await process.wait()

	const processCreateBranch = await sandbox.process.start({ cmd: `git checkout -b ai-developer-${branchID}`, cwd: repoDirPath })
	await processCreateBranch.wait()

	const setRemote = await sandbox.process.start({ cmd: `git remote set-url origin https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com/${repo}.git`, cwd: repoDirPath })
	await setRemote.wait()

	return 'success'
}
