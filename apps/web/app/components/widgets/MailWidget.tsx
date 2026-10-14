import type { MailMessage, MailResult } from "@life/tools";
import { dataOf, useNow, useTool } from "@/lib/useTool";
import { whenShort } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";
import { Icon } from "../Icon";

/** De siste e-postene i innboksen. Med href lenker tittelen til e-postsiden. */
export function MailWidget({ count = 6, href }: { count?: number; href?: string }) {
  const state = useTool<MailResult>("hent_epost", 60_000, { count });
  const now = useNow(60_000);
  const data = dataOf(state);

  const title = data ? (data.unread > 0 ? `E-post · ${data.unread} uleste` : "E-post · alt lest") : "E-post";

  return (
    <section className="mail card" aria-labelledby="mail-title">
      <WidgetHeader id="mail-title" title={title} href={href}>
        {data?.inboxUrl && (
          <a className="pick" href={data.inboxUrl} target="_blank" rel="noreferrer">
            <Icon name="external" size={18} />
            <span>Åpne Gmail</span>
          </a>
        )}
      </WidgetHeader>

      {!data && state.status === "loading" && <p className="quiet">Henter innboksen …</p>}
      {!data && state.status === "error" && (
        <p className="notice">
          {state.message}
          {state.kind === "upstream" && " Prøver igjen om et minutt."}
        </p>
      )}

      {data && data.messages.length === 0 && <p className="quiet">Innboksen er tom.</p>}
      {data && now && data.messages.length > 0 && (
        <ol className="messages">
          {data.messages.map((m) => (
            <MessageRow key={m.uid} m={m} now={now} />
          ))}
        </ol>
      )}

      {data && state.status === "error" && <p className="source">Viser sist kjente e-poster. Får ikke kontakt med e-postserveren.</p>}
      {data && <p className="source">{data.account}</p>}
    </section>
  );
}

function MessageRow({ m, now }: { m: MailMessage; now: Date }) {
  const body = (
    <>
      <span className="msg-from">
        {!m.seen && <span className="msg-dot" aria-label="Ulest" />}
        {m.from}
      </span>
      <time className="msg-time" dateTime={m.date}>
        {whenShort(m.date, now)}
      </time>
      <span className="msg-subject">{m.subject}</span>
    </>
  );

  return (
    <li className="msg" data-unread={!m.seen || undefined}>
      {m.link ? (
        <a className="msg-body" href={m.link} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        <div className="msg-body">{body}</div>
      )}
    </li>
  );
}
