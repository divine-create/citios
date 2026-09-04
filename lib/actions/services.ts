
'use server'

import { db } from '@/src/prisma/db'

export async function getServicesAdminData() {
  try {
    const tasks = await db.orm.public.Task.all();
    const gigWorkers = await db.orm.public.GigWorkerProfile.all();
    const quotes = await db.orm.public.ServiceQuote.all();
    const users = await db.orm.public.User.all();

    const tasksWithDetails = tasks.map(task => ({
        ...task,
        requester: users.find(u => u.id === task.requesterId),
        courier: users.find(u => u.id === task.courierId),
        quote: quotes.find(q => q.taskId === task.id)
    }));

    const gigWorkersWithUsers = gigWorkers.map(gw => ({
        ...gw,
        user: users.find(u => u.id === gw.userId)
    }));

    return JSON.parse(JSON.stringify({
      tasks: tasksWithDetails,
      gigWorkers: gigWorkersWithUsers
    }));
  } catch (error) {
    console.error('Error fetching services data:', error);
    return null;
  }
}

