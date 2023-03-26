export async function onRequest(context) {
    const request = context.request;
    const body = await request.json();

    const { concept } = body;

    console.log(concept);

    let json = null;
    let i = 0;

    while (!json && i < 3) {
        console.log(`attempt ${i}`);

        const response = await (await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${context.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a librarian with ancyclopaedic knowledge of all concepts and their relationships. The user will give you a concept and ask for related concepts in return. Your response should be formatted like { "concept": "${concept}", "connections": [ { "concept": "", "relationship": "" } ] }' },
                    { role: 'user', content: 'Concepts related to: consciousness' },
                    { role: 'assistant', content: '{ "concetp": "consciousness", "connections": [{ "concept": "qulia", "relationship": "comprises" }, { "concept": "cognition", "relationship": "involves" }, { "concept": "perception", "relationship": "integrates" }, { "concept": "self-identity", "relationship": "constructs" }, { "concept": "awareness", "relationship": "encompasses" } ] }' },
                    { role: 'user', content: `What are concepts related to ${concept}?` }
                ]
            })
        })).json();

        console.log(response);

        const text = response.choices[0].message.content;

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
