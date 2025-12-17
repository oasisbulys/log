const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const existing = await prisma.quest.findFirst();
    if (!existing) {
        await prisma.quest.create({
            data: {
                title: "Deep Work Protocol",
                description: "Complete 4 hours of focused study.",
                target_hours: 4,
                xp_reward: 500
            }
        });
        console.log("Seeded Quest: Deep Work Protocol");
    } else {
        console.log("Quests already exist.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
