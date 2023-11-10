export const functions = [
  // Save code to file
  {
    type: 'function',
    function: {
      name: "saveCodeToFile",
      description: "Save code to file",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to save",
          },
          filename: {
            type: "string",
            description: "The filename including the path and extension",
          },
        },
      },
      required: ["code", "filename"],
    },
  },
  // List files
  {
    type: 'function',
    function: {
      name: "listFiles",
      description: "List files in a directory",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the directory",
          },
        },
      },
      required: ["path"],
    },
  },
  // Make commit
  {
    type: 'function',
    function: {
      name: "makeCommit",
      description: "Make a commit",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The commit message",
          },
        },
      },
      required: ["message"],
    },
  },
  // Make pull request
  {
    type: 'function',
    function: {
      name: "makePullRequest",
      description: "Make a pull request",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // Read file
  {
    type: 'function',
    function: {
      name: "readFile",
      description: "Read a file",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file",
          },
        },
      },
      required: ["path"],
    },
  },
]