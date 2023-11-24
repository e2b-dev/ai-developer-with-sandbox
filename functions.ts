import { AssistantCreateParams } from 'openai/src/resources/beta/assistants/assistants'
import { Sandbox, CloudBrowser } from '@e2b/sdk'
import path from 'path'

import { sandboxLog } from './utils/log'

interface Action<S = Sandbox, T = {
  [key: string]: any;
}> {
  (sandbox: S, args: T): string | Promise<string>;
}

export const functions: (AssistantCreateParams.AssistantToolsFunction & { action: Action<CloudBrowser> })[]
  = [
    {
      async action(sandbox, { code, filename }) {
        sandboxLog(`Saving code to file ${filename}`)
        try {
          const dir = path.dirname(filename)

          await sandbox.filesystem.makeDir(dir)
          await sandbox.filesystem.write(filename, code)

          return 'success'
        } catch (e) {
          return `Error: ${e.message}}`
        }
      },
      type: 'function',
      function: {
        name: 'saveCodeToFile',
        description: 'Save code to file',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to save',
            },
            filename: {
              type: 'string',
              description: 'The filename including the path and extension',
            },
          },
        },
      },
    },
    {
      async action(sandbox: CloudBrowser, { path }) {
        sandboxLog(`Listing files in ${path}`)
        try {
          const files = await sandbox.filesystem.list(path)
          const response = files.map(file => (file.isDir ? `dir: ${file.name}` : file.name)).join('\n')
          return response
        } catch (e) {
          return `Error: ${e.message}}`
        }
      },
      type: 'function',
      function: {
        name: 'listFiles',
        description: 'List files in a directory',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the directory',
            },
          },
        },
      },
    },
    {
      async action(sandbox: Sandbox, { path }) {
        sandboxLog(`Reading file ${path}`)
        try {
          return await sandbox.filesystem.read(path)
        } catch (e) {
          return `Error: ${e.message}}`
        }
      },
      type: 'function',
      function: {
        name: 'readFile',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file',
            },
          },
        },
      },
    },
  ]
