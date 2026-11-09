/** The one section header used across the homepage: small kicker, title, optional action on the right. */
export function SectionHead({
  id,
  kicker,
  title,
  action,
  center = false,
}: {
  id: string;
  kicker: string;
  title: string;
  action?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`section-head ${center ? "section-head-center" : ""}`}>
      <div>
        <p className="kicker">{kicker}</p>
        <h2 id={id} className="home-h2">
          {title}
        </h2>
      </div>
      {action && <div className="section-head-action">{action}</div>}
    </div>
  );
}
