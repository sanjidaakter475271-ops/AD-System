import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphanIssues = await prisma.$queryRawUnsafe(
    'SELECT ir.id, ir.equipment_id FROM issue_records ir LEFT JOIN equipment e ON e.id = ir.equipment_id WHERE e.id IS NULL LIMIT 50'
  );
  const orphanReplaced = await prisma.$queryRawUnsafe(
    'SELECT id, replaced_equipment_id FROM issue_records WHERE replaced_equipment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM equipment e WHERE e.id = replaced_equipment_id) LIMIT 50'
  );
  const orphanWithdrawals = await prisma.$queryRawUnsafe(
    'SELECT wr.id, wr.equipment_id FROM withdrawal_records wr LEFT JOIN equipment e ON e.id = wr.equipment_id WHERE e.id IS NULL LIMIT 50'
  );
  const orphanUpgradation = await prisma.$queryRawUnsafe(
    'SELECT ur.id, ur.equipment_id FROM upgradation_records ur LEFT JOIN equipment e ON e.id = ur.equipment_id WHERE e.id IS NULL LIMIT 50'
  );

  console.log(JSON.stringify({
    orphanIssues,
    orphanIssuesCount: orphanIssues.length,
    orphanReplaced,
    orphanWithdrawals,
    orphanUpgradation,
  }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
