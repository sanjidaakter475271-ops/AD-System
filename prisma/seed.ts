import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE_UNITS = [
  "Air HQ",
  "BAF Base Bangabandhu",
  "BAF Base Bashar",
  "BAF Base Zahurul Haque",
  "BAF Base Matiur Rahman",
  "BAF Base Paharkanchanpur",
  "BAF Base Cox's Bazar",
];

const DIRECTORATES = [
  "ADOC", "Air HQ (U)", "BAF Comm Unit", "BAF RO", "CI's Office",
  "Dte AC", "Dte AD", "Dte Air Ops", "Dte Air Trng", "Dte A&W",
  "Dte C&E", "Dte Edn", "Dte Fin", "Dte FS", "Dte Met", "Dte MS",
  "Dte Pers", "Dte Proj", "Dte Rect", "Dte Sup", "Dte Sup (SPS)",
  "Dte W&C", "JAG Br", "PM Dte"
];

const prisma = new PrismaClient();

async function main() {
  // Seed Users
  await prisma.user.deleteMany();

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);

  await prisma.user.create({
    data: {
      name: 'System Admin',
      username: 'admin',
      password: hashedAdminPassword,
      role: 'admin',
      baseUnit: 'All Bases',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Inventory Staff (Air HQ)',
      username: 'user',
      password: hashedUserPassword,
      role: 'user',
      baseUnit: 'Air HQ',
    },
  });

  console.log('Seeded default Admin (admin / admin123) and User (user / user123)');

  // Seed Default Base Units & Default Offices for Air HQ
  for (const baseName of BASE_UNITS) {
    let base = await prisma.baseUnit.findUnique({ where: { name: baseName } });
    if (!base) {
      base = await prisma.baseUnit.create({
        data: { name: baseName },
      });
    }

    if (baseName === 'Air HQ') {
      for (const dirName of DIRECTORATES) {
        await prisma.office.upsert({
          where: {
            name_baseUnitId: {
              name: dirName,
              baseUnitId: base.id,
            },
          },
          update: {},
          create: {
            name: dirName,
            baseUnitId: base.id,
          },
        });
      }
    } else {
      // Seed common offices for other bases
      const commonOffices = ['Admin Branch', 'Operations Wing', 'Supply Depot', 'Signals Section', 'Flight Safety'];
      for (const offName of commonOffices) {
        await prisma.office.upsert({
          where: {
            name_baseUnitId: {
              name: offName,
              baseUnitId: base.id,
            },
          },
          update: {},
          create: {
            name: offName,
            baseUnitId: base.id,
          },
        });
      }
    }
  }

  console.log('Seeded base units & offices mapping');

  // Seed Equipment if empty
  const equipmentCount = await prisma.equipment.count();
  if (equipmentCount === 0) {
    const sampleData = [
      {
        sn: 1,
        baseUnit: 'Air HQ',
        directorate: 'ADOC',
        equipmentType: 'Desktop',
        brandModel: 'Dell OptiPlex 7080',
        serialNo: 'DELL-7080-001',
        processor: 'I7',
        generation: 10,
        ramGb: 16,
        ssdGb: 512,
        hddGb: 1000,
        storageType: 'SSD + HDD',
        status: 'Svc',
        location: 'Server Room A',
        issueStatus: 'Issued',
        isNewPc: true,
        adStatus: 'Joined',
        win10Remark: 'Upgraded',
        win10Eligible: 'Eligible',
        win11Eligible: 'Recommended for Win 11'
      },
      {
        sn: 2,
        baseUnit: 'Air HQ',
        directorate: 'Air HQ (U)',
        equipmentType: 'Laptop',
        brandModel: 'HP EliteBook 840 G8',
        serialNo: 'HP-840G8-092',
        processor: 'I5',
        generation: 11,
        ramGb: 16,
        ssdGb: 512,
        hddGb: 0,
        storageType: 'SSD Only',
        status: 'Svc',
        location: 'Command Cell',
        issueStatus: 'Issued',
        isNewPc: true,
        adStatus: 'Joined',
        win10Remark: 'Compliant',
        win10Eligible: 'Eligible',
        win11Eligible: 'Eligible'
      },
      {
        sn: 3,
        baseUnit: 'BAF Base Bangabandhu',
        directorate: 'Operations Wing',
        equipmentType: 'Desktop',
        brandModel: 'Lenovo ThinkCentre M70q',
        serialNo: 'LEN-M70Q-441',
        processor: 'I7',
        generation: 12,
        ramGb: 32,
        ssdGb: 512,
        hddGb: 1000,
        storageType: 'SSD + HDD',
        status: 'Svc',
        location: 'Base Ops Lab',
        issueStatus: 'Issued',
        isNewPc: true,
        adStatus: 'Joined',
        win10Remark: 'Compliant',
        win10Eligible: 'Eligible',
        win11Eligible: 'Recommended for Win 11'
      },
      {
        sn: 4,
        baseUnit: 'BAF Base Bashar',
        directorate: 'Supply Depot',
        equipmentType: 'Laptop',
        brandModel: 'Dell Latitude 5420',
        serialNo: 'DELL-5420-781',
        processor: 'I5',
        generation: 7,
        ramGb: 8,
        ssdGb: 256,
        hddGb: 0,
        storageType: 'SSD Only',
        status: 'U/S',
        location: 'Store Room B',
        issueStatus: 'Not Issued',
        isNewPc: false,
        adStatus: 'Not Joined',
        adRemark: 'IP issue',
        win10Remark: 'Pending Repair',
        win10Eligible: 'Eligible',
        win11Eligible: 'Not Eligible'
      }
    ];

    for (const item of sampleData) {
      await prisma.equipment.create({ data: item });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
