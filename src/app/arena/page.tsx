import Link from "next/link";
export default function Chats() {
  return <div className="chat-empty"><h1>Your comparisons</h1><p>Open a chat from the sidebar, or start with a fixed AKI example.</p><Link className="primary-button" href="/">Start a comparison</Link></div>;
}
