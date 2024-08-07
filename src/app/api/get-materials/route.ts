import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'data', 'Materials.json'), 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Error getting Materials.json:', error);
    return NextResponse.json({ error: 'Error getting Materials.json' }, { status: 500 });
  }
}