'use server'

import { db } from '@/src/prisma/db'

export async function getServicesAdminData() {
  try {
    const tasks = await db.orm.public.Task.all();
    const gigWorkers = await db.orm.public.GigWorkerProfile.all();
    const quotes = await db.orm.public.ServiceQuote.all();
    const persons = await db.orm.public.Person.where(p => p.id.in(tasks.map(t => t.requesterPersonId).filter(Boolean) as string[])).all();

    const tasksWithDetails = tasks.map(task => ({
        ...task,
        requester: persons.find(p => p.id === task.requesterPersonId),
        courierProfile: gigWorkers.find(g => g.id === task.courierProfileId),
        courierPerson: task.courierProfileId 
            ? persons.find(p => p.id === gigWorkers.find(g => g.id === task.courierProfileId)?.personId)
            : null,
        quote: quotes.find(q => q.taskId === task.id)
    }));

    const gigWorkersWithUsers = gigWorkers.map(gw => ({
        ...gw,
        user: persons.find(p => p.id === gw.personId) // Keeping "user" property name for frontend compatibility
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

