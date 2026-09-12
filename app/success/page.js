```jsx
export default function SuccessPage() {
  return (
    <main className="successPage">
      <div className="successCard">
        <div className="successIcon">✓</div>

        <div className="eyebrow">PAYMENT CONFIRMED</div>

        <h1>You&apos;re all set.</h1>

        <p>
          Your payment was successfully completed. To receive your
          purchase, contact DropFits through text message or join our
          Discord.
        </p>

        <div className="successActions">
          <a
            href="sms:+17472632720"
            className="successPrimary"
          >
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

        <div className="successDivider" />

        <span className="successNote">
          Please have your order information ready when contacting us.
        </span>

        <a href="/" className="successHome">
          Return to DropFits
        </a>
      </div>
    </main>
  );
}
```
