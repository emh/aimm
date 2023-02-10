import Fastify from 'fastify'
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { Configuration, OpenAIApi } from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

const prompt = (concept) => `
    I am building a concept map. Provide 5 related concepts and their relationships to "${concept}".
    Encode your response in this json format:
    { "concept": "${concept}", "connections": [ { "concept": "", "relationship": "" } ] }
`.trim();

const schema = {
    body: {
        concept: { type: 'string' }
    }
};

fastify.post('/api/ai', { schema }, async (request, reply) => {
    const concept = request.body.concept;
    let json;
    let i = 0;

    while (!json && i < 3) {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            max_tokens: 1024,
            temperature: 0.7,
            prompt: prompt(concept)
        });

        const text = response.data.choices[0].text;

        console.log(text);

        try {
            const a = text.indexOf('{');
            const b = text.lastIndexOf('}');
            const s = text.substring(a, b + 1);
            console.log(s);

            json = JSON.parse(s);
        } catch (error) {
            console.error('Error parsing JSON', error);
        }

        i++;
    }

    if (!json) {
        return { status: 'error' };
    }

    return json;
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'dist')
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000 })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start();
