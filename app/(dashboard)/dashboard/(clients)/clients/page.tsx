import { ClientList } from "@/components/clients/client-list";
import { getClients } from "@/server/actions/clients";

export default async function ClientsPage() {
  const clients = await getClients();

  return <ClientList clients={clients} />;
}
