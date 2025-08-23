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
    const students = [
      {
        id: '1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        avatar: null,
        enrolledDate: '2024-01-20',
        progress: 75,
        lastActive: '2024-03-15',
        completedCourses: 2,
        totalCourses: 3
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        avatar: null,
        enrolledDate: '2024-02-01',
        progress: 90,
        lastActive: '2024-03-14',
        completedCourses: 1,
        totalCourses: 2
      },
      {
        id: '3',
        name: 'Mike Davis',
        email: 'mike.davis@email.com',
        avatar: null,
        enrolledDate: '2024-01-25',
        progress: 45,
        lastActive: '2024-03-10',
        completedCourses: 0,
        totalCourses: 2
      }
    ];

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching teacher students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
