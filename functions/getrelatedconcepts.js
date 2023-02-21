import { OpenAIClient } from 'openai-fetch';

const prompt = (concept) => `
    I am building a concept map. Provide 5 related concepts and their relationships to "${concept}".
    Encode your response in this json format:
    { "concept": "${concept}", "connections": [ { "concept": "", "relationship": "" } ] }
`.trim();

export async function onRequest(context) {
    const request = context.request;
    const body = await request.json();

    console.log(context.env.OPENAI_API_KEY);

    const openai = new OpenAIClient({ apiKey: context.env.OPENAI_API_KEY });

    const { concept } = body;

    console.log(concept);

    let json = {};
    let i = 0;

    while (!json && i < 3) {
        console.log(`attempt #{i}`);
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt(concept),
            max_tokens: 1024,
            temperature: 0.7
        });

        console.log(response);

        const text = response.completion;

        try {
            const a = text.indexOf('{');
            const b = text.lastIndexOf('}');
            const s = text.substring(a, b + 1);

            json = JSON.parse(s);
        } catch (error) {
            console.error('Error parsing JSON', error);
        }

        i++;
    }

    if (!json) {
        return { status: 'error' };
    }

    return new Response(JSON.stringify(json));
}
