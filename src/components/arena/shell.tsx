"use client";

import { ThemeSync, ThemeToggle } from "./theme-toggle";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, MessagesSquare, Plus, Search, Pencil, Trash2, MoreHorizontal, ChartNoAxesColumnIncreasing } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";
import { Button } from "@/components/ui/button";
import { MotionConfig } from "motion/react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuAction, SidebarProvider, SidebarTrigger, SidebarInput, useSidebar } from "@/components/ui/sidebar";
import { ShapeProvider } from "@/lib/shape-context";
import { deleteSession, updateSession, useHistory } from "./history-store";
import type { Session } from "@/lib/arena/types";

function Surface({ children }: { children: React.ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { sessions, storageError } = useHistory();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ session: Session; action: "rename" | "delete" } | null>(null);
  const openingDialog = useRef(false);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const [title, setTitle] = useState("");
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const navigate = (path: string) => { setOpenMobile(false); router.push(path); };
  return <>
    <Sidebar variant="inset" bordered={false} className="arena-sidebar">
      <SidebarHeader className="brand-row">
        <Link href="/" className="brand" aria-label="TIMELY Arena home" onClick={() => setOpenMobile(false)}><Image src="/favicon.svg" width={28} height={28} alt="" /><span><strong>TIMELY</strong> Arena</span></Link>
        {isMobile && <SidebarTrigger />}
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main navigation" className="sidebar-nav">
          <SidebarGroup className="arena-nav-group"><SidebarGroupLabel>Workspace</SidebarGroupLabel><SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton icon={House} isActive={pathname === "/"} onClick={() => navigate("/")}>Home</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton icon={MessagesSquare} isActive={pathname.startsWith("/arena")} onClick={() => navigate(sorted[0] ? `/arena/${sorted[0].id}` : "/arena")}>Chats</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton icon={ChartNoAxesColumnIncreasing} isActive={pathname === "/leaderboard"} onClick={() => navigate("/leaderboard")}>Leaderboard</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton icon={Plus} onClick={() => navigate("/")}>New chat</SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu></SidebarGroup>
          <div className="history-search"><Search size={15} /><SidebarInput aria-label="Search chats" placeholder="Search chats…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <SidebarGroup className="arena-nav-group"><SidebarGroupLabel>Recent chats</SidebarGroupLabel><SidebarMenu>
            {sorted.filter(s => s.title.toLowerCase().includes(search.toLowerCase())).map(session => <SidebarMenuItem key={session.id} className="history-item">
              <SidebarMenuButton isActive={pathname === `/arena/${session.id}`} onClick={() => navigate(`/arena/${session.id}`)} title={session.title}><span className="history-chat-kind">{session.kind === "trajectory" ? "Path" : "Text"}</span><span className="history-title">{session.title}</span></SidebarMenuButton>
              <DropdownMenu>
                <DropdownTrigger render={<SidebarMenuAction showOnHover onClick={e => { menuTrigger.current = e.currentTarget; }} aria-label={`More options for ${session.title}`}><MoreHorizontal /></SidebarMenuAction>} />
                <DropdownContent className="chat-history-menu min-w-0 w-[220px]" align="start" sideOffset={6} onCloseAutoFocus={e => { if (openingDialog.current) { e.preventDefault(); document.querySelector<HTMLElement>(".chat-edit-dialog input, .chat-edit-dialog button")?.focus(); } }}>
                  <MenuItem index={0} icon={Pencil} label="Rename chat" onSelect={() => { openingDialog.current = true; setTitle(session.title); setEditing({ session, action: "rename" }); }} />
                  <MenuItem index={1} icon={Trash2} label="Delete chat" onSelect={() => { openingDialog.current = true; setEditing({ session, action: "delete" }); }} />
                </DropdownContent>
              </DropdownMenu>
            </SidebarMenuItem>)}
          </SidebarMenu>
          {!sorted.some(s => s.title.toLowerCase().includes(search.toLowerCase())) && <p className="history-empty">{search ? "No matching chats" : "Your comparisons will appear here."}</p>}
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <div className="sidebar-appearance"><ThemeToggle /><p className="sidebar-footnote">Saved in this browser</p></div>
    </Sidebar>
    <SidebarInset id="arena" tabIndex={-1} className={`arena-main ${pathname !== "/" ? "chat-main" : ""}`}>
      <div className="open-sidebar"><SidebarTrigger /></div>
      {storageError && <p role="status" className="storage-notice">Browser storage is unavailable or could not be read. New chats may not survive a refresh.</p>}
      {children}
    </SidebarInset>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
      <DialogContent className="chat-edit-dialog" onCloseAutoFocus={e => { openingDialog.current = false; e.preventDefault(); if (menuTrigger.current?.isConnected) menuTrigger.current.focus(); else document.getElementById("arena")?.focus(); }}><DialogHeader>
        <DialogTitle>{editing?.action === "delete" ? "Delete chat?" : "Rename chat"}</DialogTitle>
        <DialogDescription>{editing?.action === "delete" ? `“${editing.session.title}” and its messages will be removed from this browser.` : "Choose a short name for this comparison."}</DialogDescription></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (!editing) return;
          if (editing.action === "delete") { deleteSession(editing.session.id); if (pathname === `/arena/${editing.session.id}`) navigate("/arena"); }
          else if (title.trim()) updateSession(editing.session.id, { title: title.trim().slice(0, 80) });
          setEditing(null);
        }}>
          {editing?.action === "rename" && <input aria-label="Chat name" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} autoFocus />}
          <div className="dialog-actions"><DialogClose asChild><Button type="button" variant="tertiary">Cancel</Button></DialogClose><Button type="submit" disabled={editing?.action === "rename" && !title.trim()}>{editing?.action === "delete" ? "Delete chat" : "Save name"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
export function ArenaShell({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user"><ThemeSync /><ShapeProvider defaultShape="rounded"><SidebarProvider width="16rem" persist={false}><Surface>{children}</Surface></SidebarProvider></ShapeProvider></MotionConfig>;
}
