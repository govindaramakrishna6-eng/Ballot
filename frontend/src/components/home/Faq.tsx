import { isLocalChain, targetChain } from "../../config/chains";
import { ChevronIcon } from "../icons";

const network = isLocalChain ? "a local test chain" : `Ethereum ${targetChain.name}`;

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need a wallet to vote?",
    a: "To vote or create a poll, yes — a browser wallet like MetaMask signs your vote so the contract knows it's you and can enforce one vote per wallet. Browsing polls and results needs no wallet at all.",
  },
  {
    q: "Which network does Ballot use?",
    a: `Ballot runs on ${network}, Ethereum's public test network. It works exactly like Ethereum mainnet, but uses free test ETH, so trying it costs nothing real.`,
  },
  {
    q: "Are votes anonymous?",
    a: "Votes are pseudonymous, not secret. Your wallet address and choice are public on-chain — that's what makes every result verifiable. Your name isn't attached unless you've linked it to your address yourself (for example with ENS).",
  },
  {
    q: "Are there gas fees?",
    a: "Yes, every vote or new poll is a transaction with a small network fee. On Sepolia that fee is paid in free test ETH from a faucet. Ballot itself charges nothing and the review screen shows the estimated fee before you sign.",
  },
  {
    q: "How can I verify a vote or result?",
    a: "After voting you get a ballot receipt with the transaction hash and block number — open it on Etherscan to see your vote recorded. For results, open the contract on Etherscan and read getPoll for any poll id; the counts match what you see here.",
  },
  {
    q: "What happens when a poll ends?",
    a: "At the deadline the contract stops accepting votes — even a vote sent one second late is rejected. The final counts are frozen forever and appear under Results, with a winner (or a tie) marked.",
  },
  {
    q: "Is the voting contract controlled by an admin?",
    a: "No. The contract has no owner, no admin functions and can't be upgraded. A poll's creator can only cancel it before the first vote, so nobody can erase a poll that's going against them.",
  },
];

/** Native <details> accordion: keyboard and screen-reader friendly with zero JavaScript. */
export function Faq() {
  return (
    <section className="home-section" aria-labelledby="faq-title" id="faq">
      <div className="split">
        <div className="split-intro">
          <p className="kicker">Questions</p>
          <h2 id="faq-title" className="home-h2">
            Frequently asked
          </h2>
          <p className="card-body mt-3">Short answers about wallets, fees, privacy and how to check results yourself.</p>
        </div>
        <div className="faq" data-testid="faq">
          {FAQ.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>
                <span>{f.q}</span>
                <ChevronIcon className="icon-sm faq-chevron" />
              </summary>
              <p className="card-body">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
