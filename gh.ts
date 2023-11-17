import path from 'path'
import { Sandbox } from '@e2b/sdk'
import { customAlphabet } from 'nanoid'

import { sandboxLog } from './log'

const GIT_USERNAME = process.env.GIT_USERNAME!
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!

const gitEmail = 'e2b-assistant[bot]@users.noreply.github.com'
const gitName = 'e2b-assistant[bot]'

export const rootdir = '/home/user'
export const repoDir = 'repo'
export const repoDirPath = path.posix.join(rootdir, repoDir)

export const branchID = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6)()

export async function loginWithGH(sandbox: Sandbox) {
  await sandbox.filesystem.write('/home/user/.github-token', GITHUB_TOKEN)
  const process = await sandbox.process.start({
    cmd: `gh auth login --with-token < /home/user/.github-token &&
git config --global user.email '${gitEmail}' &&
git config --global user.name '${gitName}' &&
git config --global push.autoSetupRemote true`,
  })
  const output = await process.wait()
  if (output.exitCode !== 0) {
    throw new Error(`Make sure you've set 'GITHUB_TOKEN' env variable correctly. ${output.stderr}`)
  }
}

export async function cloneRepo(sandbox: Sandbox, repo: string) {
  sandboxLog(`Cloning repo ${repo}`)

  const process = await sandbox.process.start({
    cmd: `gh repo clone ${repo} ${repoDirPath}`,
  })
  const output = await process.wait()

  if (output.exitCode !== 0) {
    throw new Error(`Cloning repo failed. ${output.stderr}`)
  }

  const processCreateBranch = await sandbox.process.start({
    cmd: `git checkout -b ai-developer-${branchID}`,
    cwd: repoDirPath,
  })
  await processCreateBranch.wait()

  const setRemote = await sandbox.process.start({
    cmd: `git remote set-url origin https://${GIT_USERNAME}:${GITHUB_TOKEN}@github.com/${repo}.git`,
    cwd: repoDirPath,
  })
  await setRemote.wait()
}
