const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const fs = require('fs');
const path = require('path');

async function main() {
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  const functionsDir = path.join(__dirname, 'v1');
  const files = fs.readdirSync(functionsDir);

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      const routeName = file.replace(/\.(js|ts)$/, '');
      const filePath = path.join(functionsDir, file);
      
      let handler = require(filePath);
      if (handler.default && typeof handler.default === 'function') {
        handler = handler.default;
      }
      
      fastify.all(`/v1/${routeName}`, async (request, reply) => {
        const req = {
          query: request.query,
          body: request.body,
          headers: request.headers,
          method: request.method,
          url: request.url,
        };

        const res = {
          status: (statusCode) => {
            reply.status(statusCode);
            return res;
          },
          json: (data) => {
            reply.send(data);
            return res;
          },
          send: (data) => {
            reply.send(data);
            return res;
          },
          setHeader: (name, value) => {
            reply.header(name, value);
            return res;
          },
          end: (data) => {
            reply.send(data);
            return res;
          }
        };

        try {
          await handler(req, res);
        } catch (error) {
          fastify.log.error(error);
          reply.status(500).send({ error: 'Internal Server Error' });
        }
      });
    }
  }

  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
