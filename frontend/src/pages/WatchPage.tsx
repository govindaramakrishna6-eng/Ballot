/** The explainer video on its own page, so the homepage stays short. */
export function WatchPage() {
  return (
    <section aria-labelledby="watch-title" className="page watch-page">
      <p className="kicker">Video guide</p>
      <h1 id="watch-title" className="home-h2">
        See how Ballot works in 2 minutes
      </h1>
      <p className="muted mt-1">
        Create a poll, cast a vote, get your ballot receipt and watch the result, all on a real blockchain.
      </p>
      {/* Self-hosted (same origin, so the CSP needs no change). preload="none" means the 5 MB file only
          downloads when someone presses play. Captions are burned into the video. */}
      <figure className="card explainer" data-testid="explainer">
        <video
          className="explainer-video"
          controls
          preload="none"
          playsInline
          poster="/explainer-poster.jpg"
          width={1280}
          height={720}
          aria-label="Ballot explained in 2 minutes, with narration and on-screen captions"
          data-testid="explainer-video"
        >
          <source src="/ballot-explainer.mp4" type="video/mp4" />
          Your browser can't play this video.
        </video>
        <figcaption className="explainer-cap">
          <span className="mono">2:00</span> Narrated, with captions. Recorded on a local test chain, so the receipt
          shows "Hardhat Local" instead of Sepolia.
        </figcaption>
      </figure>
    </section>
  );
}
