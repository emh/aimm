import { Configuration, OpenAIApi } from "openai-edge"

const prompt = (concept) => `
    I am building a concept map. Provide 5 related concepts and their relationships to "${concept}".
    Encode your response in this json format:
    { "concept": "${concept}", "connections": [ { "concept": "", "relationship": "" } ] }
`.trim();

export async function onRequest(context) {
    const request = context.request;
    const body = await request.json();

    console.log(context.env.OPENAI_API_KEY);

    const configuration = new Configuration({
        apiKey: context.env.OPENAI_API_KEY
    });
    const openai = new OpenAIApi(configuration)

    const { concept } = body;

    console.log(concept);

    let json = null;
    let i = 0;

    while (!json && i < 3) {
        console.log(`attempt ${i}`);
        const response = await (await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: prompt(concept),
            max_tokens: 1024,
            temperature: 0.7
        })).json();

        console.log(response);

        const text = response.choices[0].text;

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

    return new Response(JSON.stringify(json), {
        headers: {
            "content-type": "application/json"
        }
    });
}
