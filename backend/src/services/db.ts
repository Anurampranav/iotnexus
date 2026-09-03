import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function initDb() {
  await prisma.$connect();

  // Ensure default master Home exists
  await prisma.home.upsert({
    where: { id: 'home_flurry_1' },
    create: {
      id: 'home_flurry_1',
      name: 'Vivaan Smart Residence',
      ownerId: 'user_master',
      rooms: {
        createMany: {
          data: [
            { id: 'room_living', name: 'Living Room', icon: 'sofa' },
            { id: 'room_kitchen', name: 'Kitchen', icon: 'stove' },
            { id: 'room_utility', name: 'Utility Area', icon: 'water-pump' },
            { id: 'room_rooftop', name: 'Rooftop', icon: 'home-roof' },
          ],
        },
      },
    },
    update: {},
  });
}
