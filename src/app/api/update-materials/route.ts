import { NextRequest, NextResponse } from 'next/server';
import { updateMaterials } from '@/lib/MaterialUpdater';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const referenceFile = formData.get('referenceFile') as File;
  const targetFiles = formData.getAll('targetFiles') as File[];
  const model = formData.get('model') as string;
  const applyVariants = formData.get('applyVariants') === 'true';
  const applyMoodRotation = formData.get('applyMoodRotation') === 'true';

  try {
    const updatedFiles = await updateMaterials(referenceFile, targetFiles, model, applyVariants, applyMoodRotation);
    return NextResponse.json({ message: 'Materials updated successfully', updatedFiles });
  } catch (error) {
    console.error('Error updating materials:', error);
    return NextResponse.json({ error: 'Error updating materials' }, { status: 500 });
  }
}