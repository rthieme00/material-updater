import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'Materials.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContents);
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error('Error reading Materials.json:', error);
    return NextResponse.json({ error: 'Error reading Materials.json' }, { status: 500 });
  }
}