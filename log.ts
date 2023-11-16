import chalk from 'chalk'

const orange = chalk.hex('#FFB766')

export function onLog(output: { line: string }) {
  sandboxLog(output.line)
}

export function sandboxLog(line: string) {
  console.log(`${orange('[Sandbox]')} ${line}`)
}

export function assistantLog(line: string) {
  console.log(`${chalk.blue('[Assistant]')} ${line}`)
}
