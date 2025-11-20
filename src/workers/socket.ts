import { WebSocketServer } from 'ws';
import { prisma } from '../plugins/prismaPlugin';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  const wss = new WebSocketServer({ server: fastify.server });
  const clients = new Map(); // Map<ws, { id, mode }>
  const previousData = new Map(); // Map<`${mode}-${id}`, data>

  fastify.log.info('WebSocket server initialized');

  wss.on('connection', (ws: any) => {
    fastify.log.info('Client connected');

    ws.on('message', async (message: any) => {
      try {
        const { type, id, mode } = JSON.parse(message.toString());

        if (type === 'update' && id && mode) {
          clients.set(ws, { id, mode });

          const tasksData = await fetchTasksByMode(id, mode);
          if (tasksData.length > 0) {
            ws.send(JSON.stringify({ type: 'tasksUpdate', tasks: tasksData }));
            previousData.set(`${mode}-${id}`, tasksData);
          }
        }
      } catch (error) {
        fastify.log.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      fastify.log.info('Client disconnected');


      const info = clients.get(ws);
      if(info){
        previousData.delete(`${info.mode}-${info.id}`);
      }
      previousData.delete(ws);
    });
  });

  // Check for updates every 5 seconds
  setInterval(async () => {
    for (const [client, info] of clients.entries()) {

      const {id, mode} = info;
      const key = `mode-${id}`;

      const newTaskData = await fetchTasksByMode(id,mode);

      const previousTaskData = previousData.get(key);

      if (JSON.stringify(newTaskData) !== JSON.stringify(previousTaskData)) {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: 'tasksUpdate', tasks: newTaskData }));
          previousData.set(key, newTaskData);
        }
      }
    }
  }, 5000);
}

// Dispatcher
const fetchTasksByMode = async (id: string, mode: 'entity' | 'social') => {
  if (mode === 'entity') return await fetchEntityTasks(id);
  if (mode === 'social') return await fetchSocialTasks(id);
  return [];
};

// Function to fetch latest tasks from Prisma
const fetchEntityTasks = async (id: string) => {
  const entityLinks = await prisma.entityLink.findMany({
    where: {
      entityRequestId: id,
      link_profile: { not: '' },
    },
    select: {
      site: true,
      email: true,
      username: true,
      password: true,
      link_profile: true,
      link_post: true,
      note: true,
    }
  });

  const filteredLinks1 = entityLinks.filter((link: any) => link.link_profile !== '');

  const filteredLinks2 = entityLinks.filter(
    (link: any) =>
      link.link_profile !== '' &&
      link.note === 'stacking' &&
      link.link_post !== link.link_profile
  );

  // Dùng JSON.stringify để loại trùng object (Set không hiểu object phức tạp)
  const mapToKey = (link: any) => JSON.stringify(link);
  const uniqueMap = new Map<string, any>();

  [...filteredLinks1, ...filteredLinks2].forEach((link) => {
    uniqueMap.set(mapToKey(link), link);
  });

  const uniqueLinks = Array.from(uniqueMap.values());

  return uniqueLinks;
};

const fetchSocialTasks = async (id: string) => {
  const socialLinks = await prisma.socialLink.findMany({
    where: {
      socialRequestId: id,
      link_post: { not: '' },
    },
    select: {
      domain: true,
      link_post: true,
    }
  });

  // Lọc tương tự như entity
  const filteredLinks = socialLinks.filter(
    (link: any) =>
      link.link_profile !== '' &&
      (link.note === 'stacking' ? link.link_post !== link.link_profile : true)
  );

  const mapToKey = (link: any) => JSON.stringify(link);
  const uniqueMap = new Map<string, any>();
  filteredLinks.forEach((link) => {
    uniqueMap.set(mapToKey(link), link);
  });

  return Array.from(uniqueMap.values());
};
