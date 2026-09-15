import re

def main():
    content = """'use server'

import { db } from '@/src/prisma/db'

export async function getServicesAdminData() {
  try {
    const tasks = await db.orm.public.Task.all();
    const gigWorkers = await db.orm.public.GigWorkerProfile.all();
    const quotes = await db.orm.public.ServiceQuote.all();
    const persons = await db.orm.public.Person.all();

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
"""
    with open('lib/actions/services.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    main()
