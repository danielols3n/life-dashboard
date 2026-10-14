import { Link } from "react-router";
import { Icon } from "./Icon";

/** Tittel for en widget. Med href lenker tittelen til widgetens egen side. */
export function WidgetHeader({
  id,
  title,
  href,
  children,
}: {
  id: string;
  title: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="widget-head">
      <h2 id={id} className="widget-title">
        {href ? (
          <Link to={href} viewTransition className="widget-link">
            {title}
            <Icon name="arrow" size={16} />
          </Link>
        ) : (
          title
        )}
      </h2>
      {children && <div className="widget-actions">{children}</div>}
    </div>
  );
}
