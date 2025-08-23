import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Replace with actual database query
    // For now, return sample data structure
    const courses = [
      {
        id: '1',
        title: 'Advanced Forex Trading Strategies',
        description: 'Master advanced trading techniques and risk management',
        category: 'Trading',
        enrolledStudents: 45,
        totalLessons: 24,
        completedLessons: 18,
        rating: 4.8,
        status: 'active',
        createdAt: '2024-01-15',
        thumbnail: null
      },
      {
        id: '2',
        title: 'Technical Analysis Fundamentals',
        description: 'Learn chart patterns, indicators, and market analysis',
        category: 'Analysis',
        enrolledStudents: 32,
        totalLessons: 18,
        completedLessons: 12,
        rating: 4.6,
        status: 'active',
        createdAt: '2024-02-01',
        thumbnail: null
      }
    ];

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Error fetching teacher courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
