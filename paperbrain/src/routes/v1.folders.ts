// v1 Folders routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store/fs-json.js';
import { FolderSchema } from '../types.js';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';

const log = logger.child('route:folders');

const CreateFolderSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function foldersRoute(fastify: FastifyInstance) {
  // GET /v1/folders - List folders
  fastify.get<{
    Querystring: { projectId?: string; parentId?: string };
  }>('/v1/folders', {
    schema: {
      tags: ['folders'],
      description: 'List folders with optional filters',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          parentId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              projectId: { type: 'string' },
              name: { type: 'string' },
              parentId: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { projectId, parentId } = request.query;
    const meta = await store.loadMeta();
    let folders = meta.folders;

    if (projectId) {
      folders = folders.filter(f => f.projectId === projectId);
    }

    if (parentId !== undefined) {
      folders = folders.filter(f => f.parentId === parentId);
    }

    return folders;
  });

  // POST /v1/folders - Create a new folder
  fastify.post<{
    Body: z.infer<typeof CreateFolderSchema>;
  }>('/v1/folders', {
    schema: {
      tags: ['folders'],
      description: 'Create a new folder',
      body: {
        type: 'object',
        required: ['projectId', 'name'],
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
          parentId: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            projectId: { type: 'string' },
            name: { type: 'string' },
            parentId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = CreateFolderSchema.parse(request.body);

    const folder = FolderSchema.parse({
      id: nanoid(),
      projectId: body.projectId,
      name: body.name,
      parentId: body.parentId,
      tags: body.tags,
    });

    const meta = await store.loadMeta();
    meta.folders.push(folder);
    await store.saveMeta(meta);

    log.info(`Created folder: ${folder.id} - ${folder.name}`);
    return reply.send(folder);
  });

  // GET /v1/folders/:id - Get a folder by ID
  fastify.get<{
    Params: { id: string };
  }>('/v1/folders/:id', {
    schema: {
      tags: ['folders'],
      description: 'Get a folder by ID',
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
            projectId: { type: 'string' },
            name: { type: 'string' },
            parentId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
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
    const folder = meta.folders.find(f => f.id === id);

    if (!folder) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Folder ${id} not found`,
      });
    }

    return folder;
  });

  // PATCH /v1/folders/:id - Update a folder
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof UpdateFolderSchema>;
  }>('/v1/folders/:id', {
    schema: {
      tags: ['folders'],
      description: 'Update a folder',
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
          parentId: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            projectId: { type: 'string' },
            name: { type: 'string' },
            parentId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
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
    const body = UpdateFolderSchema.parse(request.body);

    const meta = await store.loadMeta();
    const folder = meta.folders.find(f => f.id === id);

    if (!folder) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Folder ${id} not found`,
      });
    }

    if (body.name !== undefined) folder.name = body.name;
    if (body.parentId !== undefined) folder.parentId = body.parentId;
    if (body.tags !== undefined) folder.tags = body.tags;

    await store.saveMeta(meta);
    log.info(`Updated folder: ${id}`);
    return folder;
  });

  // DELETE /v1/folders/:id - Delete a folder
  fastify.delete<{
    Params: { id: string };
  }>('/v1/folders/:id', {
    schema: {
      tags: ['folders'],
      description: 'Delete a folder',
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
    const folderIndex = meta.folders.findIndex(f => f.id === id);

    if (folderIndex === -1) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Folder ${id} not found`,
      });
    }

    meta.folders.splice(folderIndex, 1);
    await store.saveMeta(meta);
    log.info(`Deleted folder: ${id}`);
    return { ok: true };
  });

  // GET /v1/folders/:id/papers - Get papers in a folder
  fastify.get<{
    Params: { id: string };
    Querystring: { includeSubfolders?: string };
  }>('/v1/folders/:id/papers', {
    schema: {
      tags: ['folders'],
      description: 'Get papers in a folder',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          includeSubfolders: { type: 'string', enum: ['true', 'false'] },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              projectId: { type: 'string' },
              folderId: { type: 'string' },
              title: { type: 'string' },
              authors: { type: 'array', items: { type: 'string' } },
              venue: { type: 'string' },
              year: { type: 'number' },
              citations: { type: 'number' },
              sourcePath: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    const includeSubfolders = request.query.includeSubfolders === 'true';

    const papers = await store.listPapers({
      folderId: id,
      includeSubfolders,
    });

    return papers;
  });
}

