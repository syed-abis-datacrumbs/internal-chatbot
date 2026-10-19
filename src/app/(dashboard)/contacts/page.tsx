import { getContactsDirectory } from '@/lib/redis';
import ContactsUI from '@/components/dashboard/ContactsUI';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const contacts = await getContactsDirectory();
  return <ContactsUI initialContacts={contacts} />;
}
