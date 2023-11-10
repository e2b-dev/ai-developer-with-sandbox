# AI Developer With Cloud Sandbox powered by GPT-4-Turbo
<p align="center">
  <img width="100" src="/img/logo-circle.png" alt="e2b logo">
</p>

<h3>
AI Developer is an AI agent that's using <a href="https://e2b.dev/docs">custom E2B Sandbox</a>
</h3>

The E2B sandbox is used as a secure cloud environment for an AI agent to perfowm long-running tasks, run code in a secure cloud environment, and use the same tools as a human developer would use.

- Pull GitHub repository
- Read files
- Make needed changes
- Commit work
- Create a pull request

The custom E2B sandbox environment is defined in the [`e2b.Dockerfile`](./e2b.Dockerfile)

## Getting started
1. Run `npm install`
1. Copy `.env.example` and save it as `.env` file
1. Add your OpenAI API key to `.env`
1. Get E2B API Key at [https://e2b.dev/docs/getting-started/api-key](https://e2b.dev/docs/getting-started/api-key)
    - Save it to `.env`
1. Run `npm run create-ai-assistant`
1. Grab the assistant ID you just created here [https://platform.openai.com/assistants](https://platform.openai.com/assistants)
    - Save the assistant ID to `.env`
1. Create classic GitHub token [here](https://github.com/settings/tokens) and give it the `read:org` and `repo` permissions
    - Save the GitHub token to `.env`
1. Save your GitHub username to `.env`

## Run AI Developer

Run the following command in terminal and follow instructions
```bash
npm run start
```