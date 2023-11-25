import OpenAI from "openai";
import 'dotenv/config'

const openai = new OpenAI();

export async function listAIDeveloper(): Promise<{name: string, id: string}[]> {
  const myAssistants = await openai.beta.assistants.list({
    order: "desc",
    //limit: "20",
  });

  return myAssistants.data.map(assistant => ({
    name: assistant.name || 'Default Name',
    id: assistant.id
  }));
}
