// v1 Projects routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store/fs-json.js';
import { ProjectSchema } from '../types.js';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';

const log = logger.child('route:projects');

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  domainFocus: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  domainFocus: z.string().optional(),
});

export async function projectsRoute(fastify: FastifyInstance) {
  // GET /v1/projects - List all projects
  fastify.get('/v1/projects', {
    schema: {
      tags: ['projects'],
      description: 'List all projects',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              domainFocus: { type: 'string' },
            },
          },
        },
      },
    },
  }, async () => {
    const meta = await store.loadMeta();
    return meta.projects;
  });

  // POST /v1/projects - Create a new project
  fastify.post<{
    Body: z.infer<typeof CreateProjectSchema>;
  }>('/v1/projects', {
    schema: {
      tags: ['projects'],
      description: 'Create a new project',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          domainFocus: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            domainFocus: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = CreateProjectSchema.parse(request.body);
    
    const project = ProjectSchema.parse({
      id: nanoid(),
      name: body.name,
      domainFocus: body.domainFocus,
    });

    const meta = await store.loadMeta();
    meta.projects.push(project);
    await store.saveMeta(meta);

    log.info(`Created project: ${project.id} - ${project.name}`);
    return reply.send(project);
  });

  // GET /v1/projects/:id - Get a project by ID
  fastify.get<{
    Params: { id: string };
  }>('/v1/projects/:id', {
    schema: {
      tags: ['projects'],
      description: 'Get a project by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            domainFocus: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const meta = await store.loadMeta();
    const project = meta.projects.find(p => p.id === id);

    if (!project) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Project ${id} not found`,
      });
    }

    return project;
  });

  // PATCH /v1/projects/:id - Update a project
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof UpdateProjectSchema>;
  }>('/v1/projects/:id', {
    schema: {
      tags: ['projects'],
      description: 'Update a project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          domainFocus: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            domainFocus: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const body = UpdateProjectSchema.parse(request.body);

    const meta = await store.loadMeta();
    const project = meta.projects.find(p => p.id === id);

    if (!project) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Project ${id} not found`,
      });
    }

    if (body.name !== undefined) project.name = body.name;
    if (body.domainFocus !== undefined) project.domainFocus = body.domainFocus;

    await store.saveMeta(meta);
    log.info(`Updated project: ${id}`);
    return project;
  });

  // DELETE /v1/projects/:id - Delete a project
  fastify.delete<{
    Params: { id: string };
  }>('/v1/projects/:id', {
    schema: {
      tags: ['projects'],
      description: 'Delete a project',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const meta = await store.loadMeta();
    const projectIndex = meta.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Project ${id} not found`,
      });
    }

    meta.projects.splice(projectIndex, 1);
    await store.saveMeta(meta);
    log.info(`Deleted project: ${id}`);
    return { ok: true };
  });
}

