import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('civicpulse123', 10)

  const users = [
    {
      email: 'citizen@example.com',
      fullName: 'Citizen Demo',
      role: 'citizen',
      passwordHash,
    },
    {
      email: 'operator@example.com',
      fullName: 'Operator Demo',
      role: 'department_operator',
      passwordHash,
    },
    {
      email: 'officer@example.com',
      fullName: 'Field Officer Demo',
      role: 'field_officer',
      passwordHash,
    },
    {
      email: 'admin@example.com',
      fullName: 'Admin Demo',
      role: 'municipal_admin',
      passwordHash,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
  }
  
  console.log("Database seeded successfully with demo users!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
