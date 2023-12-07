import { Sandbox } from '@e2b/sdk'
import path from 'path'

import { sandboxLog } from './log'
import { branchID, repoDirPath } from './gh'

export async function makeCommit(sandbox: Sandbox, { message }: { message: string }): Promise<string> {
  sandboxLog(`Making commit with message ${message}`)
  try {
    const processAdd = await sandbox.process.start({
      cmd: 'git add .',
      cwd: repoDirPath,
    })
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

export async function makePullRequest(sandbox: Sandbox, { title }: { title: string }): Promise<string> {
  sandboxLog(`Making pull request with title ${title}`)
  try {
    const processPush = await sandbox.process.start({
      cmd: `git push -u origin ai-developer-${branchID}`,
      cwd: repoDirPath,
    })
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

export async function saveCodeToFile(
  sandbox: Sandbox,
  { code, filename }: { code: string; filename: string },
): Promise<string> {
  sandboxLog(`Saving code to file ${filename}`)
  try {
    const dir = path.dirname(filename)

    await sandbox.filesystem.makeDir(dir)
    await sandbox.filesystem.write(filename, code)

    return 'success'
  } catch (e) {
    return `Error: ${e.message}}`
  }
}

export async function makeDir(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
  sandboxLog(`Creating dir ${path}`)
  try {
    await sandbox.filesystem.makeDir(path)

    return 'success'
  } catch (e) {
    return `Error: ${e.message}}`
  }
}

export async function listFiles(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
  sandboxLog(`Listing files in ${path}`)
  try {
    const files = await sandbox.filesystem.list(path)
    const response = files.map(file => (file.isDir ? `dir: ${file.name}` : file.name)).join('\n')
    return response
  } catch (e) {
    return `Error: ${e.message}}`
  }
}

export async function readFile(sandbox: Sandbox, { path }: { path: string }): Promise<string> {
  sandboxLog(`Reading file ${path}`)
  try {
    return await sandbox.filesystem.read(path)
  } catch (e) {
    return `Error: ${e.message}}`
  }
}

export async function runCode(sandbox: Sandbox, { command }: { command: string }): Promise<string> {
  sandboxLog(`Running command ${command}`)

  try {
      const process = await sandbox.process.start({ cmd: command, cwd: repoDirPath })
      const output = await process.wait()

      if (output.exitCode !== 0) {
          throw new Error(`Command failed with exit code ${output.exitCode}. Error: ${output.stderr}`)
      }

      if (!output.stdout) {
          console.log(`Command did not produce any output. Error: ${output.stderr}`)
      }

      // Replace all non-ASCII characters in the output
      const cleanedOutput = output.stdout.replace(/[^\x00-\x7F]/g, '')

      return cleanedOutput
  } catch (e) {
      return `Error: ${e.message}`
  }
}