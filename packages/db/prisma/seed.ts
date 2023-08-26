import { PrismaClient } from "@prisma/client";

import { skillDatabase } from "../skills";

const prisma = new PrismaClient();

async function main() {
  const skillsetCreateMany = skillDatabase.map((skill, index) => {
    return {
      label: skill.label,
      description: skill.description,
      isRecommended: skill.isRecommended,
      index,
    };
  });

  await prisma.skillset.createMany({ data: skillsetCreateMany });
}

main()
  .then(async () => {
    console.log("Seeding completed");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
