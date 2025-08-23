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
    const sessions = [
      {
        id: '1',
        title: 'Live Trading Session - EUR/USD',
        courseId: '1',
        courseName: 'Advanced Forex Trading Strategies',
        scheduledDate: '2024-03-20T14:00:00Z',
        duration: 90,
        status: 'scheduled',
        participants: 12,
        maxParticipants: 25,
        meetingLink: null
      },
      {
        id: '2',
        title: 'Q&A Session - Technical Analysis',
        courseId: '2',
        courseName: 'Technical Analysis Fundamentals',
        scheduledDate: '2024-03-22T16:00:00Z',
        duration: 60,
        status: 'scheduled',
        participants: 8,
        maxParticipants: 20,
        meetingLink: null
      }
    ];

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching teacher live sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
