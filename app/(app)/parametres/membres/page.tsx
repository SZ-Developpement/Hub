import { Members } from "@/components/settings/members";
import { listMembers } from "@/lib/server/members";
import { getAppContext } from "@/lib/session";

export default async function MembersSettingsPage() {
  const ctx = await getAppContext();
  const members = await listMembers(ctx.organizationId);

  return (
    <div className="space-y-6">
      <Members
        canManage={ctx.role === "OWNER"}
        members={members.map((member) => ({
          id: member.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          lastActiveAt:
            member.user.sessions[0]?.updatedAt.toISOString() ?? null,
          isCurrentUser: member.user.id === ctx.user.id,
        }))}
      />
    </div>
  );
}
