import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'Materials.json'), 'utf-8');
    const materialData = JSON.parse(data);
    const models = Object.keys(materialData.models);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error getting models:', error);
    return NextResponse.json({ error: 'Error getting models' }, { status: 500 });
  }
}