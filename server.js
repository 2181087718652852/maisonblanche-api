import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const fastify = Fastify({ logger: true });
const require = createRequire(import.meta.url);
global.require = require;

await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.join(__dirname, 'v1');
const files = fs.readdirSync(functionsDir);

for (const file of files) {
  if (file.endsWith('.js') || file.endsWith('.ts')) {
    const routeName = file.replace(/\.(js|ts)$/, '');
    const modulePath = `./v1/${file}`;
    
    const { default: handler } = await import(modulePath);
    
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
        },
        send: (data) => {
          reply.send(data);
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

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
