import { z } from "zod";
import { ImapFlow } from "imapflow";
import { defineTool, ToolConfigError } from "./registry.ts";

export type MailMessage = {
  uid: number;
  from: string;
  fromAddress: string | null;
  subject: string;
  date: string;
  seen: boolean;
  /** Direktelenke til tråden i Gmail, når kontoen er Gmail */
  link: string | null;
};

export type MailResult = {
  account: string;
  unread: number;
  /** Lenke til innboksen i nettleseren, når den er kjent */
  inboxUrl: string | null;
  messages: MailMessage[];
};

/**
 * Lenke inn i Gmail for riktig konto. authuser velger kontoen uansett hvilken
 * rekkefølge brukeren er logget inn i; e-postadressen i selve stien (/u/…) avvises.
 */
const gmailUrl = (user: string, view: string) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(user)}#${view}`;

export const mail = defineTool({
  name: "hent_epost",
  description:
    "Henter de siste e-postene i innboksen (avsender, emne, tid og om de er lest) og antall uleste. Leser aldri innholdet i e-postene.",
  input: z.object({
    count: z.coerce.number().int().min(1).max(30).default(8),
  }),
  cacheSeconds: 60,
  async run({ count }, ctx): Promise<MailResult> {
    const account = ctx.config.mail;
    if (!account) {
      throw new ToolConfigError("E-post er ikke satt opp. Sett IMAP_USER og IMAP_PASSWORD i .env i hovedmappen.");
    }

    const gmail = account.host === "imap.gmail.com";
    const client = new ImapFlow({
      host: account.host,
      port: account.port,
      secure: true,
      auth: { user: account.user, pass: account.password },
      logger: false,
    });

    try {
      await client.connect();
    } catch (err: any) {
      if (err?.authenticationFailed) {
        throw new ToolConfigError(
          gmail
            ? "Gmail avviste innloggingen. Bruk et app-passord fra myaccount.google.com/apppasswords, ikke det vanlige passordet."
            : "E-postserveren avviste innloggingen. Sjekk IMAP_USER og IMAP_PASSWORD.",
        );
      }
      throw new Error(`Får ikke kontakt med e-postserveren (${account.host}).`);
    }

    try {
      const status = await client.status("INBOX", { unseen: true });
      const lock = await client.getMailboxLock("INBOX", { readOnly: true });
      const messages: MailMessage[] = [];
      try {
        const total = typeof client.mailbox === "object" ? client.mailbox.exists : 0;
        if (total > 0) {
          const range = `${Math.max(1, total - count + 1)}:*`;
          for await (const m of client.fetch(range, { uid: true, envelope: true, flags: true, internalDate: true, threadId: gmail })) {
            const sender = m.envelope?.from?.[0];
            messages.push({
              uid: m.uid,
              from: sender?.name || sender?.address || "Ukjent avsender",
              fromAddress: sender?.address ?? null,
              subject: m.envelope?.subject || "(uten emne)",
              date: new Date(m.envelope?.date ?? m.internalDate ?? Date.now()).toISOString(),
              seen: m.flags?.has("\\Seen") ?? false,
              // Gmail sin X-GM-THRID i heksadesimal er ID-en i nettadressen til tråden
              link:
                gmail && m.threadId
                  ? gmailUrl(account.user, `all/${BigInt(m.threadId).toString(16)}`)
                  : null,
            });
          }
        }
      } finally {
        lock.release();
      }

      return {
        account: account.user,
        unread: (status && status.unseen) || 0,
        inboxUrl: gmail ? gmailUrl(account.user, "inbox") : null,
        messages: messages.reverse(),
      };
    } finally {
      await client.logout().catch(() => {});
    }
  },
});
