const sandbox = e2b.Sandbox.create('ai-agent-sandbox')

sandbox.oauth.googleCalendar.authWithToken()
sandbox.oauth.googleCalendar.signInWithPassword({ email, password })

sandbox.oauth.github.auth()

sandbox.oauth.onChange((provider, status) => {})

sandbox.register('make_commit', async (sandbox: Sandbox, { message }: any) => {
  await sandbox.process.start(`git commit -m ${message} .`)
})

sandbox.register('new_calendar_event', async (sandbox: Sandbox) => {
  sandbox.oauth.googleCalendar.events.insert({})
})

// In other file

sandbox.openai.assistant.run(openai, thread)

// You can use Sandboxes via:
// - API/SDK (as we have it now)
// - or you can seen the sandbox in our dashboard and just copy the functions schema!
//    - Does it mean you need to "publish" the sandbox so the registered actions are available?

// Is this code and no-code approach?
