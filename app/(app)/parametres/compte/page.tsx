import { PasswordForm, ProfileForm, SessionsList } from "@/components/settings/account-forms";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/session";
import { describeUserAgent } from "@/lib/user-agent";

export default async function AccountSettingsPage() {
  const ctx = await getAppContext();
  const sessions = await db.session.findMany({
    where: { userId: ctx.user.id, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <ProfileForm
        avatarUrl={ctx.user.image}
        defaultValues={{ name: ctx.user.name, email: ctx.user.email }}
      />
      <PasswordForm />
      <SessionsList
        sessions={sessions.map((session) => {
          const device = describeUserAgent(session.userAgent);
          return {
            id: session.id,
            device: device.label,
            mobile: device.mobile,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt.toISOString(),
            lastActiveAt: session.updatedAt.toISOString(),
            current: session.token === ctx.sessionToken,
          };
        })}
      />
    </div>
  );
}
