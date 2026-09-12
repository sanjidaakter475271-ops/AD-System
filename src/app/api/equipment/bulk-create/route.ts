import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';

// POST: Bulk create equipment records, optionally issue immediately
// Body:
// {
//   items: Array<{
//     baseUnit, directorate, equipmentType, brandModel, serialNo,
//     processor, generation, ramGb, ssdGb, hddGb, status, location,
//     isNewPc, intendedOffice, intendedBase, adStatus, adRemark,
//     // If issueImmediately:
//     issueImmediately?: boolean,
//     issueMode?: 'without-replace' | 'replace-old',
//     issuedTo?: string,       // section name
//     issuedOffice?: string,
//     issuedBase?: string,
//     oldPcId?: number,        // if replace-old
//     withdrawnBy?: string,
//     withdrawalReason?: string,
//   }>,
//   letterRef?: string,       // common for all
//   letterAuthority?: string, // common for all
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

    // Validate required fields per item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.baseUnit || !item.directorate || !item.equipmentType) {
        return NextResponse.json(
          { error: `Row ${i + 1}: baseUnit, directorate, and equipmentType are required` },
          { status: 400 }
        );
      }
      if (item.issueImmediately) {
        if (!item.issuedTo) {
          return NextResponse.json(
            { error: `Row ${i + 1}: issuedTo (section) is required when issueImmediately is true` },
            { status: 400 }
          );
        }
        if (!item.issuedOffice || !item.issuedBase) {
          return NextResponse.json(
            { error: `Row ${i + 1}: issuedOffice and issuedBase are required when issueImmediately is true` },
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
    }

    // Get current max sn to auto-increment
    const maxSnRecord = await prisma.equipment.findFirst({
      orderBy: { sn: 'desc' },
      select: { sn: true },
    });
    let nextSn = (maxSnRecord?.sn ?? 0) + 1;

    const results = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const item of items) {
        const ssdGb = item.ssdGb ?? 0;
        const hddGb = item.hddGb ?? 0;
        const ramGb = item.ramGb ?? 8;
        const processor = item.processor ?? 'I5';
        const generation = item.generation ?? 7;

        const win10Eligible = calcWin10(processor, generation, ramGb);
        const win11Eligible = calcWin11(processor, generation, ramGb, ssdGb, hddGb);
        const storageType = calcStorageType(ssdGb, hddGb);

        // Derive directorate from intendedOffice for new PCs
        const directorate = item.isNewPc && item.intendedOffice
          ? item.intendedOffice
          : item.directorate;

        const equipment = await tx.equipment.create({
          data: {
            sn: nextSn++,
            baseUnit: item.isNewPc && item.intendedBase ? item.intendedBase : item.baseUnit,
            directorate,
            equipmentType: item.equipmentType,
            brandModel: item.brandModel || null,
            serialNo: item.serialNo || null,
            processor,
            generation,
            ramGb,
            ssdGb,
            hddGb,
            storageType,
            status: item.isNewPc ? 'Svc' : (item.status || 'Svc'),
            location: item.location || null,
            issueStatus: item.isNewPc ? 'Not Issued' : (item.issueStatus || 'Not Issued'),
            isNewPc: Boolean(item.isNewPc),
            intendedOffice: item.isNewPc ? (item.intendedOffice || null) : null,
            intendedBase: item.isNewPc ? (item.intendedBase || null) : null,
            adStatus: item.adStatus || 'Pending',
            adRemark: item.adRemark || null,
            win10Eligible,
            win11Eligible,
          },
        });

        let issueRecord = null;
        let withdrawalRecord = null;

        // Issue immediately if requested
        if (item.issueImmediately) {
          const issuedTo = item.issuedTo;
          const issuedOffice = item.issuedOffice;
          const issuedBase = item.issuedBase;

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

          const isReplacement = item.issueMode === 'replace-old' && Boolean(item.oldPcId);

          issueRecord = await tx.issueRecord.create({
            data: {
              equipmentId: equipment.id,
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
            where: { id: equipment.id },
            data: {
              issueStatus: 'Issued',
              directorate: issuedOffice,
              baseUnit: issuedBase,
              location: issuedTo,
            },
          });

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
        }

        created.push({ equipment, issueRecord, withdrawalRecord });
      }

      return created;
    });

    return NextResponse.json({
      message: `${results.length} equipment record(s) created successfully`,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Bulk Create API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk create equipment' }, { status: 500 });
  }
}
