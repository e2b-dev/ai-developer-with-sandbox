import { AssistantCreateParams } from 'openai/src/resources/beta/assistants/assistants'

export const functions: Array<
  | AssistantCreateParams.AssistantToolsCode
  | AssistantCreateParams.AssistantToolsRetrieval
  | AssistantCreateParams.AssistantToolsFunction
> = [
  // Save code to file
  {
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
  // List files
  {
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
  // Make commit
  {
    type: 'function',
    function: {
      name: 'makeCommit',
      description: 'Make a commit',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The commit message',
          },
        },
      },
    },
  },
  // Make pull request
  {
    type: 'function',
    function: {
      name: 'makePullRequest',
      description: 'Make a pull request',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The pull request title',
          },
          body: {
            type: 'string',
            description: 'The pull request body',
          },
        },
      },
    },
  },
  // Read file
  {
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
