import MeetingRoomClient from './MeetingRoomClient';

export default async function MeetingRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingRoomClient id={id} />;
}
