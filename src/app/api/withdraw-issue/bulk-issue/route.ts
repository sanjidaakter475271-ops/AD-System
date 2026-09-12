import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Bulk issue existing new PCs (isNewPc=true, issueStatus=Not Issued)
// Used from Bulk Issue tab in Withdraw & Issue page
// Body:
// {
//   letterRef: string,
//   letterAuthority: string,
//   items: Array<{
//     newPcId: number,
//     issuedTo: string,        // section
//     issuedOffice: string,
//     issuedBase: string,
//     issueMode: 'without-replace' | 'replace-old',
//     oldPcId?: number,        // required if replace-old
//     withdrawnBy?: string,
//     withdrawalReason?: string,
//   }>
// }

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { items, letterRef, letterAuthority } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
    }

    // Validate
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.newPcId) {
        return NextResponse.json({ error: `Row ${i + 1}: newPcId is required` }, { status: 400 });
      }
      if (!item.issuedTo || !item.issuedOffice || !item.issuedBase) {
        return NextResponse.json(
          { error: `Row ${i + 1}: issuedTo, issuedOffice, and issuedBase are required` },
          { status: 400 }
        );
      }
      if (item.issueMode === 'replace-old' && !item.oldPcId) {
        return NextResponse.json(
          { error: `Row ${i + 1}: oldPcId is required when issueMode is replace-old` },
          { status: 400 }
        );
      }
    }

    const results = await prisma.$transaction(async (tx) => {
      const issued = [];

      for (const item of items) {
        const issuedTo = item.issuedTo;
        const issuedOffice = item.issuedOffice;
        const issuedBase = item.issuedBase;
        const isReplacement = item.issueMode === 'replace-old' && Boolean(item.oldPcId);

        // Auto-number PC within section
        const existingInSection = await tx.issueRecord.findMany({
          where: {
            issuedTo,
            issuedOffice,
            issuedBase,
            equipment: { issueStatus: 'Issued' },
          },
          select: { pcNumber: true },
        });
        const usedNumbers = existingInSection.map(r => r.pcNumber ?? 0).filter(n => n > 0);
        const nextPcNumber = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
        const sectionLabel = `PC-${nextPcNumber}`;

        // Create issue record
        const issueRecord = await tx.issueRecord.create({
          data: {
            equipmentId: parseInt(item.newPcId),
            issuedTo,
            issuedOffice,
            issuedBase,
            sectionLabel,
            pcNumber: nextPcNumber,
            letterRef: letterRef || null,
            letterAuthority: letterAuthority || null,
            isReplacement,
            replacedEquipmentId: isReplacement ? parseInt(item.oldPcId) : null,
          },
        });

        // Mark new PC as Issued
        await tx.equipment.update({
          where: { id: parseInt(item.newPcId) },
          data: {
            issueStatus: 'Issued',
            directorate: issuedOffice,
            baseUnit: issuedBase,
            location: issuedTo,
          },
        });

        let withdrawalRecord = null;

        // If replacing old PC
        if (isReplacement) {
          const oldPc = await tx.equipment.findUnique({
            where: { id: parseInt(item.oldPcId) },
          });

          withdrawalRecord = await tx.withdrawalRecord.create({
            data: {
              equipmentId: parseInt(item.oldPcId),
              withdrawnFrom: oldPc?.directorate || issuedOffice,
              withdrawnBase: oldPc?.baseUnit || issuedBase,
              withdrawnBy: item.withdrawnBy || user.name || user.username,
              reason: item.withdrawalReason || 'Replaced with new PC (Not Eligible)',
              issueRecordId: issueRecord.id,
            },
          });

          await tx.equipment.update({
            where: { id: parseInt(item.oldPcId) },
            data: { issueStatus: 'Withdrawn & Issued' },
          });

          await tx.upgradationRecord.create({
            data: {
              equipmentId: parseInt(item.oldPcId),
              withdrawalId: withdrawalRecord.id,
              remarks: `Withdrawn from ${oldPc?.directorate || issuedOffice} (${oldPc?.baseUnit || issuedBase})`,
            },
          });
        }

        issued.push({ issueRecord, withdrawalRecord });
      }

      return issued;
    });

    return NextResponse.json({
      message: `${results.length} PC(s) issued successfully`,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Bulk Issue API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk issue equipment' }, { status: 500 });
  }
}
