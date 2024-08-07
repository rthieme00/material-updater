import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const updatedData = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'Materials.json');
    
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
    
    return NextResponse.json({ message: 'Materials.json updated successfully' });
  } catch (error) {
    console.error('Error updating Materials.json:', error);
    return NextResponse.json({ error: 'Error updating Materials.json' }, { status: 500 });
  }
}