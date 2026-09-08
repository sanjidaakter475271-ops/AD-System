import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      newPcId,            // new PC being issued as replacement
      oldPcId,            // old not-eligible PC being replaced (withdrawn)
      issuedTo,           // Section/person name
      issuedOffice,
      issuedBase,
      letterRef,
      letterAuthority,
      isReplacement,      // false = direct issue without withdrawing old PC
      withdrawnBy,
      withdrawalReason,
    } = body;

    if (!issuedTo || !issuedOffice || !issuedBase) {
      return NextResponse.json({ error: 'issuedTo, issuedOffice and issuedBase are required' }, { status: 400 });
    }
    if (!newPcId) {
      return NextResponse.json({ error: 'newPcId is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ------------------------------------------------------------------
      // 1. Auto-number the PC within the same section / issuedTo in this office
      //    Count active (non-withdrawn) issues for same issuedTo + issuedOffice + issuedBase
      // ------------------------------------------------------------------
      const existingInSection = await tx.issueRecord.findMany({
        where: {
          issuedTo,
          issuedOffice,
          issuedBase,
          // Only count active (not-withdrawn) records
          equipment: {
            issueStatus: 'Issued',
          },
        },
        select: { pcNumber: true },
      });

      // Find the next available PC number in this section
      const usedNumbers = existingInSection.map(r => r.pcNumber ?? 0).filter(n => n > 0);
      const nextPcNumber = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
      const sectionLabel = `PC-${nextPcNumber}`;

      // ------------------------------------------------------------------
      // 2. Create Issue Record — new PC is what's being issued
      // ------------------------------------------------------------------
      const issueRecord = await tx.issueRecord.create({
        data: {
          equipmentId: parseInt(newPcId),
          issuedTo,
          issuedOffice,
          issuedBase,
          sectionLabel,
          pcNumber: nextPcNumber,
          letterRef: letterRef || null,
          letterAuthority: letterAuthority || null,
          isReplacement: Boolean(isReplacement),
          replacedEquipmentId: isReplacement && oldPcId ? parseInt(oldPcId) : null,
        },
      });

      // ------------------------------------------------------------------
      // 3. Mark new PC as Issued AND update its directorate/baseUnit to the
      //    issued office so it appears correctly in the main inventory
      // ------------------------------------------------------------------
      await tx.equipment.update({
        where: { id: parseInt(newPcId) },
        data: {
          issueStatus: 'Issued',
          directorate: issuedOffice,
          baseUnit: issuedBase,
          location: issuedTo,  // section label stored in location field
        },
      });

      let withdrawalRecord = null;
      // ------------------------------------------------------------------
      // 4. If replacement: withdraw the old PC
      // ------------------------------------------------------------------
      if (isReplacement && oldPcId) {
        const oldPc = await tx.equipment.findUnique({
          where: { id: parseInt(oldPcId) },
        });

        withdrawalRecord = await tx.withdrawalRecord.create({
          data: {
            equipmentId: parseInt(oldPcId),
            withdrawnFrom: oldPc?.directorate || issuedOffice,
            withdrawnBase: oldPc?.baseUnit || issuedBase,
            withdrawnBy: withdrawnBy || user.name || user.username,
            reason: withdrawalReason || 'Replaced with new PC (Not Eligible)',
            issueRecordId: issueRecord.id,
          },
        });

        // Mark old PC as Withdrawn & Issued
        await tx.equipment.update({
          where: { id: parseInt(oldPcId) },
          data: { issueStatus: 'Withdrawn & Issued' },
        });

        // Auto-create UpgradationRecord for the withdrawn PC
        await tx.upgradationRecord.create({
          data: {
            equipmentId: parseInt(oldPcId),
            withdrawalId: withdrawalRecord.id,
            remarks: `Withdrawn from ${oldPc?.directorate || issuedOffice} (${oldPc?.baseUnit || issuedBase})`,
          },
        });
      }

      return { issueRecord, withdrawalRecord };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to issue equipment' }, { status: 500 });
  }
}
