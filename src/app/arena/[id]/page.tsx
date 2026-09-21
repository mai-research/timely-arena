import { ArenaChat } from "@/components/arena/chat";
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArenaChat id={id} />;
}
