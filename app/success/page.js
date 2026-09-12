export default function SuccessPage() {
  return (
    <main className="successPage">
      <div className="successCard">
        <div className="successIcon">
          ✓
        </div>

        <span className="eyebrow">
          PAYMENT COMPLETE
        </span>

        <h1>
          You're all set.
        </h1>

        <p>
          Your payment was completed successfully.
          Follow the delivery instructions associated
          with your purchase or contact DropFits support
          if you need assistance.
        </p>

        <a href="/" className="primaryButton">
          Back to DropFits
        </a>
      </div>
    </main>
  );
}
