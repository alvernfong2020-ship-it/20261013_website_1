"use client";

import React, { useState } from "react";
import { Badge, Button, Card, Input, Select } from "@/components/ui/primitives";
import { ConfirmDialog, useToast } from "@/components/ui/overlays";
import { api } from "@/lib/client";

type Member = { id: string; role: string; user: { id: string; name: string | null; email: string } };

export function MembersManager({
  workspaceId,
  initialMembers,
  seats,
  canManage,
  collaboration,
  ownerId,
  currentUserId,
}: {
  workspaceId: string;
  initialMembers: Member[];
  seats: number;
  canManage: boolean;
  collaboration: boolean;
  ownerId: string;
  currentUserId: string;
}) {
  const toast = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  async function add() {
    if (!email) return;
    setBusy(true);
    try {
      const res = await api<{ member: Member }>(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        json: { email, role },
      });
      setMembers((prev) => [...prev, res.member]);
      setEmail("");
      toast.push({ title: "Member added", tone: "success" });
    } catch (e) {
      toast.push({ title: "Could not add member", description: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: Member, newRole: string) {
    try {
      await api(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        json: { userId: member.user.id, role: newRole },
      });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
      toast.push({ title: "Role updated", tone: "success" });
    } catch (e) {
      toast.push({ title: "Could not update role", description: (e as Error).message, tone: "error" });
    }
  }

  async function remove(member: Member) {
    try {
      await api(`/api/workspaces/${workspaceId}/members?userId=${member.user.id}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.push({ title: "Member removed", tone: "info" });
    } catch (e) {
      toast.push({ title: "Could not remove", description: (e as Error).message, tone: "error" });
    } finally {
      setRemoveTarget(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Team</h2>
        <Badge tone="neutral">
          {members.length} / {seats === Infinity ? "∞" : seats} seats
        </Badge>
      </div>

      {!collaboration && (
        <p className="mt-2 rounded-lg border border-line bg-paper-sunken/60 p-3 text-sm text-ink-soft">
          Team collaboration is not included in the current plan. You can still invite members after upgrading.
        </p>
      )}

      {canManage && collaboration && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="member@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Member email"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            {["ADMIN", "EDITOR", "VIEWER"].map((r) => (
              <option key={r} value={r}>
                {r.toLowerCase()}
              </option>
            ))}
          </Select>
          <Button onClick={add} loading={busy}>
            Invite
          </Button>
        </div>
      )}

      <ul className="mt-4 divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{m.user.name || m.user.email}</p>
              <p className="truncate text-xs text-ink-faint">{m.user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.user.id === ownerId ? (
                <Badge tone="accent">owner</Badge>
              ) : canManage && m.user.id !== currentUserId ? (
                <Select value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role for ${m.user.email}`}>
                  {["ADMIN", "EDITOR", "VIEWER"].map((r) => (
                    <option key={r} value={r}>
                      {r.toLowerCase()}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge tone="neutral">{m.role.toLowerCase()}</Badge>
              )}
              {canManage && m.user.id !== ownerId && m.user.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => setRemoveTarget(m)}
                  className="text-xs text-danger underline underline-offset-2"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-ink-faint">
        Invitations do not send email in this environment — the person must already have an account.
      </p>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && remove(removeTarget)}
        title="Remove this member?"
        description={`${removeTarget?.user.email} will lose access to this workspace.`}
        confirmLabel="Remove member"
      />
    </Card>
  );
}
