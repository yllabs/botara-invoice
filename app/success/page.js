export default function SuccessPage() {
  return (
    <main className="successPage">
      <section className="successCard">
        <div className="successIcon">✓</div>

        <p className="eyebrow">PAYMENT CONFIRMED</p>

        <h1>You&apos;re all set.</h1>

        <p>
          Your payment was successfully completed.
          Contact DropFits to receive your purchase.
        </p>

        <div className="successActions">
          <a href="sms:+17472632720" className="successPrimary">
            Message DropFits
          </a>

          <a
            href="https://discord.gg/YWQVMKN3Ft"
            className="successDiscord"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Discord
          </a>
        </div>

        <div className="successDivider"></div>

        <p className="successNote">
          Please have your order information ready when contacting us.
        </p>

        <a href="/" className="successHome">
          Return to DropFits
        </a>
      </section>
    </main>
  );
}
```
