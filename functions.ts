import { AssistantCreateParams } from 'openai/src/resources/beta/assistants/assistants'

export const assistant_config = 
{
  instructions: `You are an AI developer.
  When given a coding task, write and save code to files, install any packages if needed, make commits, and finally create a PR once done. You're logged in using GitHub CLI and have all the needed credentials.
  Start by listing all files inside the repo. You work inside the '/home/user/repo' directory where the repository is already cloned so you don't need to clone it yourself.
  You also have the ability to actually run code. You should try these with custom prompt if you do not find other appropriate tool.
  Don't argue with me and just complete the task.`,
  name: 'AI Developer',
  model: 'gpt-4-1106-preview',
  //model: 'gpt-3.5-turbo-1106',
}

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
  // Run code
  {
    type: 'function',
    function: {
      name: 'runCode',
      description: 'Run code or commands in the sandbox environment',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to run',
          },
        },
      },
    },
  },
]
